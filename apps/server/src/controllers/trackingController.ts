import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { redisClient } from '../config/redis';
import { AppError } from '../middleware/errorHandler';
import { ErrorCode, BatchLocationPingSchema } from '@krishi/shared';
import { emitToAdmins, emitToRoom, emitToUser, notifyUser } from '../services/events';
import { publishOrder, publishRental, setOrderStatus, setRentalStatus } from '../services/lifecycle';
import { logger } from '../config/logger';
import {
  validateGpsPing,
  cacheDriverTelemetry,
  getOnlineDriversTelemetry,
  calculateHaversineDistanceKm,
} from '../services/realtimeService';

export async function getDriverJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;

    // Find driver record
    const driver = await prisma.driver.findUnique({
      where: { userId },
      include: { vehicle: true },
    });

    if (!driver) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'User is not registered as an active driver/operator');
    }

    const jobs = await prisma.deliveryJob.findMany({
      where: {
        driverId: driver.id,
        status: { notIn: ['DELIVERED', 'FAILED'] },
      },
      include: {
        order: {
          include: {
            address: true,
            user: { select: { name: true, phone: true } },
            items: true,
          },
        },
        rental: {
          include: {
            address: true,
            user: { select: { name: true, phone: true } },
            machine: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ success: true, data: jobs });
  } catch (err) {
    next(err);
  }
}

export async function updateJobStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { status, otp, cashCollectedPaise } = req.body;

    if (!['ACCEPTED', 'STARTED', 'ARRIVED', 'DELIVERED'].includes(status)) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, `Unsupported job status ${status}`);
    }

    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw new AppError(403, ErrorCode.FORBIDDEN, 'Driver not found');

    const job = await prisma.deliveryJob.findFirst({
      where: { id, driverId: driver.id },
      include: { order: true, rental: true },
    });

    if (!job) throw new AppError(404, ErrorCode.NOT_FOUND, 'Job not found');
    if (job.status === 'DELIVERED' || job.status === 'FAILED') {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'This job is already closed');
    }

    if (status === 'DELIVERED') {
      // Customer handover OTP is mandatory once one has been issued
      if (job.otpHash) {
        if (!otp || !(await bcrypt.compare(String(otp), job.otpHash))) {
          throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Invalid customer handover OTP');
        }
      }
      await prisma.deliveryJob.update({
        where: { id: job.id },
        data: {
          status: 'DELIVERED',
          cashCollectedPaise: cashCollectedPaise ? parseInt(cashCollectedPaise, 10) : null,
        },
      });
      if (job.orderId) await setOrderStatus(job.orderId, 'DELIVERED', userId, 'Delivered with customer OTP');
      if (job.rentalId) await setRentalStatus(job.rentalId, 'ARRIVED', userId, 'Machine handed over at farm');
    } else {
      await prisma.deliveryJob.update({ where: { id: job.id }, data: { status } });

      if (job.orderId) {
        if (status === 'STARTED') {
          // Fresh 4-digit OTP the farmer reads out to the driver on handover
          const plainOtp = crypto.randomInt(1000, 9999).toString();
          await prisma.deliveryJob.update({
            where: { id: job.id },
            data: { otpHash: await bcrypt.hash(plainOtp, 10) },
          });
          if (job.order?.status === 'CONFIRMED' || job.order?.status === 'PLACED') {
            await setOrderStatus(job.orderId, 'PACKED', userId, 'Picked up by driver');
          }
          await setOrderStatus(job.orderId, 'OUT_FOR_DELIVERY', userId, 'Driver started delivery trip');
          await notifyUser(
            job.order?.userId,
            'Delivery OTP',
            `Your order is on the way. Share OTP ${plainOtp} with the driver at delivery.`,
            { orderId: job.orderId, deliveryOtp: plainOtp }
          );
        } else {
          await publishOrder(job.orderId);
        }
      }

      if (job.rentalId) {
        if (status === 'STARTED') await setRentalStatus(job.rentalId, 'DISPATCHED', userId, 'Machine dispatched');
        else if (status === 'ARRIVED') await setRentalStatus(job.rentalId, 'NEAR_FARM', userId, 'Machine near farm');
        else await publishRental(job.rentalId);
      }
    }

    const statusPayload = { jobId: job.id, status, timestamp: new Date().toISOString() };
    emitToRoom(`job:${job.id}`, 'tracking:status', statusPayload);
    emitToUser(userId, 'job:updated', statusPayload);
    emitToAdmins('job:updated', statusPayload);

    return res.status(200).json({ success: true, data: { status } });
  } catch (err) {
    next(err);
  }
}

export async function submitDriverLocation(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const driver = await prisma.driver.findUnique({
      where: { userId },
      include: { vehicle: true },
    });
    if (!driver) throw new AppError(403, ErrorCode.FORBIDDEN, 'Driver not found');

    const { pings } = BatchLocationPingSchema.parse(req.body);

    // 1. Validate pings server-side: freshness and impossible speed jumps (>150 km/h)
    for (const ping of pings) {
      const validation = await validateGpsPing(driver.id, ping);
      if (!validation.valid) {
        throw new AppError(400, ErrorCode.VALIDATION_ERROR, validation.error || 'Invalid GPS ping');
      }
    }

    const latestPing = pings[pings.length - 1];

    // 2. Fetch associated job to find order / rental IDs for multi-room broadcasting
    const job = await prisma.deliveryJob.findUnique({
      where: { id: latestPing.jobId },
      select: { id: true, orderId: true, rentalId: true, dropoffLat: true, dropoffLng: true },
    });

    // 3. Cache latest coordinates & telemetry in Redis
    await cacheDriverTelemetry({
      driverId: driver.id,
      driverName: driver.name,
      phone: driver.phone,
      vehicleNumber: driver.vehicle?.vehicleNumber,
      vehicleType: driver.vehicle?.vehicleType,
      jobId: latestPing.jobId,
      latitude: latestPing.latitude,
      longitude: latestPing.longitude,
      heading: latestPing.heading,
      speed: latestPing.speed,
      timestamp: latestPing.timestamp,
      lastSeen: new Date().toISOString(),
    });

    // 4. Persist batch to PostgreSQL LocationPing table
    await prisma.locationPing.createMany({
      data: pings.map((p) => ({
        jobId: p.jobId,
        driverId: driver.id,
        latitude: p.latitude,
        longitude: p.longitude,
        heading: p.heading || null,
        speed: p.speed || null,
        accuracy: p.accuracy || null,
        recordedAt: new Date(p.timestamp),
      })),
    });

    // 5. Calculate remaining distance & ETA if dropoff coordinates exist
    let distanceKmRemaining: number | null = null;
    let etaMinutes: number | null = null;
    if (job && job.dropoffLat && job.dropoffLng) {
      distanceKmRemaining = calculateHaversineDistanceKm(
        latestPing.latitude,
        latestPing.longitude,
        job.dropoffLat,
        job.dropoffLng
      );
      // Assume average speed 30 km/h in rural/semi-urban India
      const speedKmH = latestPing.speed && latestPing.speed > 5 ? latestPing.speed : 30;
      etaMinutes = Math.round((distanceKmRemaining / speedKmH) * 60);
    }

    // 6. Broadcast real-time GPS position to WebSocket rooms: order, rental, driver, job
    const locationPayload = {
      jobId: latestPing.jobId,
      orderId: job?.orderId || null,
      rentalId: job?.rentalId || null,
      driverId: driver.id,
      driverName: driver.name,
      phone: driver.phone,
      vehicleNumber: driver.vehicle?.vehicleNumber,
      latitude: latestPing.latitude,
      longitude: latestPing.longitude,
      heading: latestPing.heading,
      speed: latestPing.speed,
      distanceKmRemaining,
      etaMinutes,
      timestamp: latestPing.timestamp,
    };

    // Broadcast to the job room, the farmer's personal room and the admin fleet map
    emitToRoom(`job:${latestPing.jobId}`, 'location:update', locationPayload);
    emitToAdmins('location:update', locationPayload);
    const farmer = job?.orderId
      ? await prisma.order.findUnique({ where: { id: job.orderId }, select: { userId: true } })
      : job?.rentalId
      ? await prisma.rental.findUnique({ where: { id: job.rentalId }, select: { userId: true } })
      : null;
    emitToUser(farmer?.userId, 'location:update', locationPayload);

    return res.status(200).json({ success: true, count: pings.length });
  } catch (err) {
    next(err);
  }
}

export async function getTrackingSnapshot(req: Request, res: Response, next: NextFunction) {
  try {
    const { jobId } = req.params;

    const job = await prisma.deliveryJob.findUnique({
      where: { id: jobId },
      include: {
        driver: {
          include: { vehicle: true },
        },
        order: {
          include: { address: true },
        },
        rental: {
          include: { address: true, machine: true },
        },
      },
    });

    if (!job) throw new AppError(404, ErrorCode.NOT_FOUND, 'Tracking job not found');

    // Retrieve latest cached GPS coordinate from Redis or fallback to DB
    let latestCoords = null;
    if (redisClient) {
      try {
        const cached = await redisClient.get(`driver:loc:${job.id}`);
        if (cached) latestCoords = JSON.parse(cached);
      } catch (e) {}
    }

    if (!latestCoords) {
      const dbPing = await prisma.locationPing.findFirst({
        where: { jobId: job.id },
        orderBy: { recordedAt: 'desc' },
      });
      if (dbPing) {
        latestCoords = {
          latitude: dbPing.latitude,
          longitude: dbPing.longitude,
          heading: dbPing.heading,
          speed: dbPing.speed,
          updatedAt: dbPing.recordedAt,
        };
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        type: job.type,
        pickupCoords: { latitude: job.pickupLat, longitude: job.pickupLng },
        dropoffCoords: { latitude: job.dropoffLat, longitude: job.dropoffLng },
        driver: job.driver
          ? {
              id: job.driver.id,
              name: job.driver.name,
              phone: job.driver.phone,
              vehicleNumber: job.driver.vehicle?.vehicleNumber,
              vehicleType: job.driver.vehicle?.vehicleType,
            }
          : null,
        currentLocation: latestCoords,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminRealtimeDrivers(_req: Request, res: Response, next: NextFunction) {
  try {
    const drivers = await getOnlineDriversTelemetry();
    return res.status(200).json({
      success: true,
      count: drivers.length,
      data: drivers,
    });
  } catch (err) {
    next(err);
  }
}
