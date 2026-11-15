import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { redisClient } from '../config/redis';
import { logger } from '../config/logger';
import { AuthTokenPayload } from '@krishi/shared';

export interface DriverTelemetry {
  driverId: string;
  driverName: string;
  phone: string;
  vehicleNumber?: string;
  vehicleType?: string;
  jobId?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: string;
  lastSeen: string;
}

// In-memory fallback when Redis is not configured (single-instance deployments)
const memoryTelemetry = new Map<string, DriverTelemetry>();

/**
 * Calculates great-circle distance between two GPS coordinates in kilometers.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validates GPS ping server-side:
 * 1. Checks timestamp freshness (rejects >10m past or >30s future)
 * 2. Checks coordinates within valid ranges
 * 3. Checks speed jump (>150 km/h) relative to last ping
 */
export async function validateGpsPing(
  driverId: string,
  ping: {
    jobId: string;
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    timestamp: string;
  }
): Promise<{ valid: boolean; error?: string; calculatedSpeedKmH?: number }> {
  // 1. Geographic bounds check
  if (ping.latitude < -90 || ping.latitude > 90 || ping.longitude < -180 || ping.longitude > 180) {
    return { valid: false, error: 'GEOGRAPHIC_BOUNDS_EXCEEDED' };
  }

  // 2. Timestamp freshness check
  const pingTime = new Date(ping.timestamp).getTime();
  if (isNaN(pingTime)) {
    return { valid: false, error: 'INVALID_TIMESTAMP_FORMAT' };
  }

  const now = Date.now();
  const maxStaleMs = 10 * 60 * 1000; // 10 minutes
  const maxFutureMs = 30 * 1000; // 30 seconds

  if (pingTime < now - maxStaleMs) {
    return { valid: false, error: 'STALE_GPS_PING' };
  }

  if (pingTime > now + maxFutureMs) {
    return { valid: false, error: 'FUTURE_TIMESTAMP_REJECTED' };
  }

  // 3. Speed jump check against previous cached location
  if (redisClient) {
    try {
      const prevDataStr = await redisClient.get(`driver:telemetry:${driverId}`);
      if (prevDataStr) {
        const prev = JSON.parse(prevDataStr) as DriverTelemetry;
        const prevTime = new Date(prev.timestamp).getTime();
        const timeDeltaSec = (pingTime - prevTime) / 1000;

        if (timeDeltaSec >= 2) {
          const distanceKm = calculateHaversineDistanceKm(
            prev.latitude,
            prev.longitude,
            ping.latitude,
            ping.longitude
          );
          const calculatedSpeedKmH = (distanceKm / timeDeltaSec) * 3600;

          if (calculatedSpeedKmH > 150) {
            logger.warn(
              {
                driverId,
                calculatedSpeedKmH: Math.round(calculatedSpeedKmH),
                distanceKm: distanceKm.toFixed(2),
                timeDeltaSec,
              },
              'GPS speed jump detected and rejected'
            );
            return {
              valid: false,
              error: `SPEED_JUMP_REJECTED: ${Math.round(calculatedSpeedKmH)} km/h exceeds 150 km/h limit`,
              calculatedSpeedKmH,
            };
          }
        }
      }
    } catch (redisErr: any) {
      logger.warn({ err: redisErr.message }, 'Could not read previous telemetry from Redis');
    }
  }

  return { valid: true };
}

/**
 * Stores driver telemetry in Redis for instant O(1) reads and health telemetry.
 */
export async function cacheDriverTelemetry(telemetry: DriverTelemetry): Promise<void> {
  memoryTelemetry.set(telemetry.driverId, telemetry);
  if (!redisClient) return;
  try {
    const key = `driver:telemetry:${telemetry.driverId}`;
    await redisClient.set(key, JSON.stringify(telemetry), 'EX', 86400); // 24 hours TTL
    if (telemetry.jobId) {
      await redisClient.set(`driver:loc:${telemetry.jobId}`, JSON.stringify(telemetry), 'EX', 3600);
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to cache driver telemetry in Redis');
  }
}

/**
 * Retrieves all online drivers and their latest telemetry from Redis.
 */
export async function getOnlineDriversTelemetry(): Promise<DriverTelemetry[]> {
  if (!redisClient) {
    const cutoff = Date.now() - 30 * 60 * 1000;
    return [...memoryTelemetry.values()].filter((t) => new Date(t.lastSeen).getTime() > cutoff);
  }
  try {
    const keys = await redisClient.keys('driver:telemetry:*');
    if (!keys || keys.length === 0) return [];

    const pipeline = redisClient.pipeline();
    keys.forEach((key) => pipeline.get(key));
    const results = await pipeline.exec();

    if (!results) return [];

    const drivers: DriverTelemetry[] = [];
    for (const [err, raw] of results) {
      if (!err && raw && typeof raw === 'string') {
        try {
          drivers.push(JSON.parse(raw));
        } catch (_) {}
      }
    }
    return drivers;
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to query online drivers from Redis');
    return [];
  }
}

/**
 * Server-side authorization check for joining Socket.IO rooms.
 * Rooms: order:{orderId}, rental:{bookingId}, driver:{driverId}, owner:{ownerId}, admin.
 */
export async function checkRoomAccess(
  user: { id: string; role: string },
  roomName: string
): Promise<boolean> {
  if (!user || !user.id || !roomName) return false;

  // Admins have access to all rooms
  if (user.role === 'ADMIN') {
    return true;
  }

  // Admin-only room
  if (roomName === 'admin') {
    return user.role === 'ADMIN';
  }

  // Driver room: driver:{driverId}
  if (roomName.startsWith('driver:')) {
    const driverTargetId = roomName.slice(7);
    if (user.id === driverTargetId) return true;

    try {
      // Check if user has Driver record matching driverTargetId
      const driverRecord = await prisma.driver.findFirst({
        where: { id: driverTargetId, userId: user.id },
        select: { id: true },
      });
      return !!driverRecord;
    } catch (_) {
      return false;
    }
  }

  // Owner room: owner:{ownerId}
  if (roomName.startsWith('owner:')) {
    const ownerTargetId = roomName.slice(6);
    return user.id === ownerTargetId;
  }

  // Order room: order:{orderId}
  if (roomName.startsWith('order:')) {
    const orderId = roomName.slice(6);
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          userId: true,
          deliveryJob: {
            select: {
              driver: {
                select: { userId: true },
              },
            },
          },
        },
      });

      if (!order) return false;
      const isFarmer = order.userId === user.id;
      const isAssignedDriver = order.deliveryJob?.driver?.userId === user.id;
      return isFarmer || isAssignedDriver;
    } catch (_) {
      return false;
    }
  }

  // Rental room: rental:{bookingId}
  if (roomName.startsWith('rental:')) {
    const rentalId = roomName.slice(7);
    try {
      const rental = await prisma.rental.findUnique({
        where: { id: rentalId },
        select: {
          userId: true,
          machine: { select: { ownerId: true } },
          deliveryJob: {
            select: {
              driver: {
                select: { userId: true },
              },
            },
          },
        },
      });

      if (!rental) return false;
      const isFarmer = rental.userId === user.id;
      const isOwner = rental.machine?.ownerId === user.id;
      const isAssignedDriver = rental.deliveryJob?.driver?.userId === user.id;
      return isFarmer || isOwner || isAssignedDriver;
    } catch (_) {
      return false;
    }
  }

  // Legacy job room: job:{jobId}
  if (roomName.startsWith('job:')) {
    const jobId = roomName.slice(4);
    try {
      const job = await prisma.deliveryJob.findUnique({
        where: { id: jobId },
        select: {
          driver: { select: { userId: true } },
          order: { select: { userId: true } },
          rental: { select: { userId: true } },
        },
      });
      if (!job) return false;
      return (
        job.driver?.userId === user.id ||
        job.order?.userId === user.id ||
        job.rental?.userId === user.id
      );
    } catch (_) {
      return false;
    }
  }

  return false;
}
