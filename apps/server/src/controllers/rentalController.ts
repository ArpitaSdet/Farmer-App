import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { ErrorCode, RentalStatus } from '@krishi/shared';
import { createRazorpayOrder } from '../services/payment';
import { env } from '../config/env';
import { emitToAdmins, notifyUser } from '../services/events';
import { publishRental } from '../services/lifecycle';
import bcrypt from 'bcryptjs';

async function generateHumanRentalId(): Promise<string> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const prefix = `RENT-${yyyy}${mm}${dd}-`;

  const countToday = await prisma.rental.count({
    where: {
      humanId: { startsWith: prefix },
    },
  });

  const seq = String(countToday + 1).padStart(4, '0');
  return `${prefix}${seq}`;
}

export async function getRentalQuote(req: Request, res: Response, next: NextFunction) {
  try {
    const { machineId, durationHours, includeOperator = true, deliveryRequired = true } = req.body;

    if (!machineId || !durationHours) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'machineId and durationHours are required');
    }

    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
    });

    if (!machine) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Machine not found');
    }

    const hours = Math.max(1, parseFloat(durationHours));
    let baseRatePaise = 0;

    if (hours >= 8) {
      const fullDays = Math.floor(hours / 8);
      const remainingHours = hours % 8;
      baseRatePaise = fullDays * machine.dailyRatePaise + remainingHours * machine.hourlyRatePaise;
    } else {
      baseRatePaise = hours * machine.hourlyRatePaise;
    }

    const operatorFeePaise = includeOperator ? Math.round(hours * 15000) : 0;
    const deliveryFeePaise = deliveryRequired ? 99900 : 0;
    const subtotalPaise = baseRatePaise + operatorFeePaise + deliveryFeePaise;
    const gstPaise = Math.round(subtotalPaise * 0.18);
    const depositPaise = Math.round(baseRatePaise * 0.2);
    const totalPaise = subtotalPaise + gstPaise + depositPaise;

    return res.status(200).json({
      success: true,
      data: {
        machineId: machine.id,
        durationHours: hours,
        breakdown: {
          baseRatePaise,
          operatorFeePaise,
          deliveryFeePaise,
          subtotalPaise,
          gstPaise,
          depositPaise,
          totalPaise,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createRentalBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const {
      machineId,
      addressId,
      startDate,
      durationHours,
      includeOperator = true,
      deliveryRequired = true,
      paymentMethod = 'COD',
    } = req.body;

    if (!machineId || !addressId || !startDate || !durationHours) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'All booking parameters are required');
    }

    const [machine, address] = await Promise.all([
      prisma.machine.findUnique({ where: { id: machineId } }),
      prisma.address.findUnique({ where: { id: addressId } }),
    ]);

    if (!machine || !machine.isAvailable) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Machine not found or not available');
    }

    if (!address) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Farm address not found');
    }

    const hours = Math.max(1, parseFloat(durationHours));
    const humanId = await generateHumanRentalId();

    const bookingStart = new Date(startDate);
    const bookingEnd = new Date(bookingStart.getTime() + hours * 3600 * 1000);

    // Atomic quote recalculation to guarantee server-side pricing integrity
    let baseRatePaise = hours >= 8
      ? Math.floor(hours / 8) * machine.dailyRatePaise + (hours % 8) * machine.hourlyRatePaise
      : hours * machine.hourlyRatePaise;

    const operatorFeePaise = includeOperator ? Math.round(hours * 15000) : 0;
    const deliveryFeePaise = deliveryRequired ? 99900 : 0;
    const subtotalPaise = baseRatePaise + operatorFeePaise + deliveryFeePaise;
    const gstPaise = Math.round(subtotalPaise * 0.18);
    const depositPaise = Math.round(baseRatePaise * 0.2);
    const totalPaise = subtotalPaise + gstPaise + depositPaise;

    // Strict Database Transaction: Prevent Double Booking Overlaps
    const rental = await prisma.$transaction(async (tx) => {
      // 1. Check existing active bookings for this machine
      const activeRentals = await tx.rental.findMany({
        where: {
          machineId,
          status: { notIn: ['CANCELLED', 'COMPLETED'] },
        },
      });

      for (const ex of activeRentals) {
        const exStart = new Date(ex.startDate);
        const exEnd = new Date(exStart.getTime() + ex.durationHours * 3600 * 1000);
        if (bookingStart < exEnd && bookingEnd > exStart) {
          throw new AppError(
            409,
            ErrorCode.CONFLICT,
            `Machine is already booked during this time window (${exStart.toISOString()} to ${exEnd.toISOString()})`
          );
        }
      }

      // 2. Check MachineAvailability calendar for blackout dates
      const bookingDateOnly = new Date(bookingStart.getFullYear(), bookingStart.getMonth(), bookingStart.getDate());
      const blackoutSlot = await tx.machineAvailability.findUnique({
        where: {
          machineId_date: {
            machineId,
            date: bookingDateOnly,
          },
        },
      });

      if (blackoutSlot && (blackoutSlot.isBooked || blackoutSlot.isBlackout)) {
        throw new AppError(
          409,
          ErrorCode.CONFLICT,
          `Machine is unavailable on ${bookingDateOnly.toDateString()}: ${blackoutSlot.reason || 'Blocked by owner'}`
        );
      }

      // 3. Mark availability as booked
      await tx.machineAvailability.upsert({
        where: {
          machineId_date: {
            machineId,
            date: bookingDateOnly,
          },
        },
        create: {
          machineId,
          date: bookingDateOnly,
          isBooked: true,
          reason: `Booked by rental ${humanId}`,
        },
        update: {
          isBooked: true,
          reason: `Booked by rental ${humanId}`,
        },
      });

      // 4. Generate 4-digit handover OTP
      const rawOtp = String(Math.floor(1000 + Math.random() * 9000));
      const otpHash = await bcrypt.hash(rawOtp, 10);

      // 5. Create Rental record
      const r = await tx.rental.create({
        data: {
          humanId,
          machineId,
          userId,
          addressId,
          status: 'CONFIRMED',
          startDate: bookingStart,
          durationHours: hours,
          includeOperator: Boolean(includeOperator),
          deliveryRequired: Boolean(deliveryRequired),
          totalPaise,
          depositPaise,
          paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
        },
      });

      await tx.rentalStatusLog.create({
        data: {
          rentalId: r.id,
          fromStatus: 'CONFIRMED',
          toStatus: 'CONFIRMED',
          reason: 'Rental booking confirmed by farmer',
          actorId: userId,
        },
      });

      // 6. Create Delivery / Dispatch Job for the machine with hashed OTP
      await tx.deliveryJob.create({
        data: {
          rentalId: r.id,
          type: 'RENTAL',
          status: 'ASSIGNED',
          pickupLat: machine.latitude,
          pickupLng: machine.longitude,
          dropoffLat: address.latitude,
          dropoffLng: address.longitude,
          otpHash,
        },
      });

      return { ...r, rawHandoverOtp: rawOtp };
    });

    let razorpayOrderData = null;
    if (paymentMethod === 'RAZORPAY' && env.DEMO_MODE && !env.RAZORPAY_KEY_ID) {
      await prisma.$transaction([
        prisma.payment.create({
          data: { rentalId: rental.id, amountPaise: rental.totalPaise, status: 'PAID', method: 'RAZORPAY' },
        }),
        prisma.rental.update({ where: { id: rental.id }, data: { paymentStatus: 'PAID' } }),
      ]);
    } else if (paymentMethod === 'RAZORPAY') {
      const rzOrder = await createRazorpayOrder(rental.totalPaise, rental.humanId, {
        rentalId: rental.id,
        userId,
      });

      await prisma.payment.create({
        data: {
          rentalId: rental.id,
          razorpayOrderId: rzOrder.id,
          amountPaise: rental.totalPaise,
          status: 'PENDING',
          method: 'RAZORPAY',
        },
      });

      razorpayOrderData = {
        orderId: rzOrder.id,
        amountPaise: rzOrder.amount,
        currency: rzOrder.currency,
      };
    }

    await notifyUser(
      userId,
      `Booking ${rental.humanId}`,
      `Booking received. Share handover OTP ${rental.rawHandoverOtp} with the operator when the machine arrives.`,
      { rentalId: rental.id, handoverOtp: rental.rawHandoverOtp }
    );
    if (machine.ownerId) {
      await notifyUser(machine.ownerId, 'New booking request', `${machine.name} requested for ${hours} hours`, {
        rentalId: rental.id,
      });
    }
    emitToAdmins('machine:updated', { id: machine.id });
    await publishRental(rental.id);

    return res.status(201).json({
      success: true,
      data: {
        rental,
        razorpay: razorpayOrderData,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getRentals(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const rentals = await prisma.rental.findMany({
      where: { userId },
      include: {
        machine: {
          include: { images: { take: 1, orderBy: { displayOrder: 'asc' } } },
        },
        address: true,
        deliveryJob: {
          include: {
            driver: { include: { vehicle: true } },
          },
        },
        statusLogs: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ success: true, data: rentals });
  } catch (err) {
    next(err);
  }
}

export async function getRentalById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const rental = await prisma.rental.findFirst({
      where: {
        OR: [{ id }, { humanId: id }],
        userId,
      },
      include: {
        machine: {
          include: { images: { orderBy: { displayOrder: 'asc' } } },
        },
        address: true,
        deliveryJob: {
          include: {
            driver: { include: { vehicle: true } },
          },
        },
        statusLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!rental) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Rental booking not found');
    }

    return res.status(200).json({ success: true, data: rental });
  } catch (err) {
    next(err);
  }
}

export async function rateMachineBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { rating, comment } = req.body;

    const numRating = parseInt(rating, 10);
    if (!numRating || numRating < 1 || numRating > 5) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Rating must be an integer between 1 and 5');
    }

    const rental = await prisma.rental.findFirst({
      where: {
        OR: [{ id }, { humanId: id }],
        userId,
      },
      include: { machine: true },
    });

    if (!rental) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Rental not found');
    }

    if (rental.status !== 'COMPLETED') {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Can only rate machinery after booking is completed');
    }

    // Update real average rating on Machine
    const currentRating = rental.machine.rating ?? numRating;
    const newRating = Number(((currentRating + numRating) / 2).toFixed(1));

    await prisma.machine.update({
      where: { id: rental.machineId },
      data: {
        rating: newRating,
      },
    });

    await prisma.rentalStatusLog.create({
      data: {
        rentalId: rental.id,
        fromStatus: 'COMPLETED',
        toStatus: 'COMPLETED',
        reason: `Farmer review: ${numRating} stars - "${comment || 'No comment'}"`,
        actorId: userId,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        message: 'Rating submitted successfully',
        machineId: rental.machineId,
        newRating,
      },
    });
  } catch (err) {
    next(err);
  }
}
