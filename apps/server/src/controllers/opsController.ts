import { Request, Response, NextFunction } from 'express';
import { RentalStatus, OrderStatus } from '@prisma/client';
import { ErrorCode } from '@krishi/shared';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { broadcast, emitToAdmins, notifyUser } from '../services/events';
import { checkRoomAccess } from '../services/realtimeService';
import {
  ORDER_INCLUDE,
  RENTAL_INCLUDE,
  pickAvailableDriver,
  setOrderStatus,
  setRentalStatus,
} from '../services/lifecycle';

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

/* ------------------------------------------------------------------ */
/* Farmer: addresses, rental cancel, reviews, coupons                  */
/* ------------------------------------------------------------------ */

export const listAddresses = wrap(async (req, res) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user!.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  res.json({ success: true, data: addresses });
});

export const createAddress = wrap(async (req, res) => {
  const { label = 'Farm', village, district, state = 'Karnataka', pincode, latitude, longitude, isDefault } = req.body;
  if (!village || !district || !pincode) {
    throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Village, district and pincode are required');
  }
  const userId = req.user!.id;
  const count = await prisma.address.count({ where: { userId } });
  if (isDefault) await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  const address = await prisma.address.create({
    data: {
      userId,
      label,
      village,
      district,
      state,
      pincode: String(pincode),
      latitude: Number(latitude) || 15.3647,
      longitude: Number(longitude) || 75.124,
      isDefault: Boolean(isDefault) || count === 0,
    },
  });
  res.status(201).json({ success: true, data: address });
});

export const updateAddress = wrap(async (req, res) => {
  const { label, village, district, state, pincode, latitude, longitude, isDefault } = req.body;
  const userId = req.user!.id;
  const addressId = req.params.id;

  const existing = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!existing) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Address not found');
  }

  if (isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }

  const updated = await prisma.address.update({
    where: { id: addressId },
    data: {
      ...(label !== undefined ? { label } : {}),
      ...(village !== undefined ? { village } : {}),
      ...(district !== undefined ? { district } : {}),
      ...(state !== undefined ? { state } : {}),
      ...(pincode !== undefined ? { pincode: String(pincode) } : {}),
      ...(latitude !== undefined ? { latitude: Number(latitude) } : {}),
      ...(longitude !== undefined ? { longitude: Number(longitude) } : {}),
      ...(isDefault !== undefined ? { isDefault: Boolean(isDefault) } : {}),
    },
  });

  res.json({ success: true, data: updated });
});

export const cancelRental = wrap(async (req, res) => {
  const rental = await prisma.rental.findFirst({
    where: { OR: [{ id: req.params.id }, { humanId: req.params.id }], userId: req.user!.id },
  });
  if (!rental) throw new AppError(404, ErrorCode.NOT_FOUND, 'Booking not found');
  if (!['CONFIRMED', 'MACHINE_ASSIGNED', 'OPERATOR_ASSIGNED'].includes(rental.status)) {
    throw new AppError(400, ErrorCode.VALIDATION_ERROR, `Booking cannot be cancelled once it is ${rental.status}`);
  }
  await prisma.deliveryJob.updateMany({ where: { rentalId: rental.id }, data: { status: 'FAILED' } });
  const updated = await setRentalStatus(rental.id, 'CANCELLED', req.user!.id, req.body?.reason || 'Cancelled by farmer');
  res.json({ success: true, data: updated });
});

export const listReviews = wrap(async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { productId: req.params.id },
    include: { user: { select: { name: true, village: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ success: true, data: reviews });
});

export const createReview = wrap(async (req, res) => {
  const rating = Math.round(Number(req.body.rating));
  if (!(rating >= 1 && rating <= 5)) throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Rating must be 1 to 5');
  const productId = req.params.id;
  const userId = req.user!.id;

  const purchased = await prisma.orderItem.findFirst({
    where: { variant: { productId }, order: { userId, status: 'DELIVERED' } },
  });
  const review = await prisma.review.create({
    data: { productId, userId, rating, comment: req.body.comment || null, isVerifiedPurchase: !!purchased },
    include: { user: { select: { name: true, village: true } } },
  });
  broadcast('review:new', { productId, review });
  res.status(201).json({ success: true, data: review });
});

export const listCoupons = wrap(async (_req, res) => {
  const coupons = await prisma.coupon.findMany({
    where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: { discountPercent: 'desc' },
  });
  res.json({ success: true, data: coupons });
});

export const listChatMessages = wrap(async (req, res) => {
  const room = req.params.room;
  if (!(await checkRoomAccess(req.user!, room))) throw new AppError(403, ErrorCode.FORBIDDEN, 'No access to this chat');
  const messages = await prisma.chatMessage.findMany({ where: { room }, orderBy: { createdAt: 'asc' }, take: 200 });
  res.json({ success: true, data: messages });
});

/* ------------------------------------------------------------------ */
/* Machine owner                                                       */
/* ------------------------------------------------------------------ */

const OWNER_NEXT: Partial<Record<RentalStatus, RentalStatus[]>> = {
  CONFIRMED: ['MACHINE_ASSIGNED', 'CANCELLED'],
  MACHINE_ASSIGNED: ['DISPATCHED', 'CANCELLED'],
  OPERATOR_ASSIGNED: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['NEAR_FARM', 'ARRIVED'],
  NEAR_FARM: ['ARRIVED'],
  ARRIVED: ['STARTED'],
  STARTED: ['COMPLETED'],
};

export const ownerDashboard = wrap(async (req, res) => {
  const ownerId = req.user!.id;
  const [machines, bookings] = await Promise.all([
    prisma.machine.findMany({
      where: { ownerId },
      include: { images: { take: 1, orderBy: { displayOrder: 'asc' } }, _count: { select: { rentals: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.rental.findMany({
      where: { machine: { ownerId } },
      include: RENTAL_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);
  const completed = bookings.filter((b) => b.status === 'COMPLETED');
  const earnings = {
    totalPaise: completed.reduce((s, b) => s + b.totalPaise - b.depositPaise, 0),
    completedJobs: completed.length,
    pendingRequests: bookings.filter((b) => b.status === 'CONFIRMED').length,
    activeJobs: bookings.filter((b) => !['CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(b.status)).length,
    hoursWorked: completed.reduce((s, b) => s + b.durationHours, 0),
  };
  res.json({ success: true, data: { machines, bookings, earnings } });
});

export const ownerCreateMachine = wrap(async (req, res) => {
  const { name, type, description = '', hourlyRate, dailyRate, operatorAvailable = true, imageUrl } = req.body;
  if (!name || !type || !hourlyRate || !dailyRate) {
    throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Name, type, hourly and daily rate are required');
  }
  const owner = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const machine = await prisma.machine.create({
    data: {
      name,
      type,
      description,
      ownerId: req.user!.id,
      village: owner?.village,
      district: owner?.district,
      hourlyRatePaise: Math.round(Number(hourlyRate) * 100),
      dailyRatePaise: Math.round(Number(dailyRate) * 100),
      operatorAvailable: Boolean(operatorAvailable),
      latitude: owner?.farmLat ?? 15.3647,
      longitude: owner?.farmLng ?? 75.124,
      rating: 4.5,
      images: imageUrl ? { create: [{ url: imageUrl }] } : undefined,
    },
    include: { images: true },
  });
  broadcast('machine:updated', machine);
  emitToAdmins('machine:updated', machine);
  res.status(201).json({ success: true, data: machine });
});

export const ownerUpdateMachine = wrap(async (req, res) => {
  const machine = await prisma.machine.findFirst({ where: { id: req.params.id, ownerId: req.user!.id } });
  if (!machine) throw new AppError(404, ErrorCode.NOT_FOUND, 'Machine not found');
  const { isAvailable, hourlyRate, dailyRate, operatorAvailable } = req.body;
  const updated = await prisma.machine.update({
    where: { id: machine.id },
    data: {
      isAvailable: isAvailable === undefined ? undefined : Boolean(isAvailable),
      operatorAvailable: operatorAvailable === undefined ? undefined : Boolean(operatorAvailable),
      hourlyRatePaise: hourlyRate ? Math.round(Number(hourlyRate) * 100) : undefined,
      dailyRatePaise: dailyRate ? Math.round(Number(dailyRate) * 100) : undefined,
    },
    include: { images: true },
  });
  broadcast('machine:updated', updated);
  res.json({ success: true, data: updated });
});

export const ownerUpdateRental = wrap(async (req, res) => {
  const status = req.body.status as RentalStatus;
  const rental = await prisma.rental.findFirst({
    where: { id: req.params.id, machine: { ownerId: req.user!.id } },
    include: { deliveryJob: true },
  });
  if (!rental) throw new AppError(404, ErrorCode.NOT_FOUND, 'Booking not found');
  if (!OWNER_NEXT[rental.status]?.includes(status)) {
    throw new AppError(400, ErrorCode.VALIDATION_ERROR, `Cannot move booking from ${rental.status} to ${status}`);
  }

  if (status === 'MACHINE_ASSIGNED' && rental.deliveryJob && rental.deliveryRequired) {
    const driver = await pickAvailableDriver();
    if (driver) {
      await prisma.deliveryJob.update({ where: { id: rental.deliveryJob.id }, data: { driverId: driver.id } });
      await notifyUser(driver.userId, 'New machine delivery job', `Deliver machine for booking ${rental.humanId}`, {
        jobId: rental.deliveryJob.id,
      });
    }
  }
  if (status === 'CANCELLED' && rental.deliveryJob) {
    await prisma.deliveryJob.update({ where: { id: rental.deliveryJob.id }, data: { status: 'FAILED' } });
  }

  const reason = status === 'CANCELLED' ? 'Declined by machine owner' : `Updated by owner to ${status}`;
  const updated = await setRentalStatus(rental.id, status, req.user!.id, reason);
  res.json({ success: true, data: updated });
});

/* ------------------------------------------------------------------ */
/* Driver extras                                                       */
/* ------------------------------------------------------------------ */

export const driverProfile = wrap(async (req, res) => {
  const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id }, include: { vehicle: true } });
  if (!driver) throw new AppError(403, ErrorCode.FORBIDDEN, 'Not a driver');
  const history = await prisma.deliveryJob.findMany({
    where: { driverId: driver.id, status: { in: ['DELIVERED', 'FAILED'] } },
    include: {
      order: { include: { address: true, user: { select: { name: true, phone: true } }, items: true } },
      rental: { include: { address: true, user: { select: { name: true, phone: true } }, machine: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
  const cashCollectedPaise = history.reduce((s, j) => s + (j.cashCollectedPaise || 0), 0);
  res.json({ success: true, data: { driver, history, cashCollectedPaise } });
});

export const driverSetAvailability = wrap(async (req, res) => {
  const driver = await prisma.driver.update({
    where: { userId: req.user!.id },
    data: { isAvailable: Boolean(req.body.isAvailable) },
  });
  emitToAdmins('driver:updated', driver);
  res.json({ success: true, data: driver });
});

/* ------------------------------------------------------------------ */
/* Admin console                                                       */
/* ------------------------------------------------------------------ */

export const adminStats = wrap(async (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [farmers, owners, drivers, orders, ordersToday, revenue, activeRentals, pendingKyc, lowStock, products, machines] =
    await Promise.all([
      prisma.user.count({ where: { role: 'FARMER' } }),
      prisma.user.count({ where: { role: 'OWNER' } }),
      prisma.driver.count(),
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.order.aggregate({ _sum: { totalPaise: true }, where: { status: { not: 'CANCELLED' } } }),
      prisma.rental.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      Promise.all([
        prisma.ownerProfile.count({ where: { kycStatus: 'PENDING_APPROVAL' } }),
        prisma.driver.count({ where: { kycStatus: 'PENDING_APPROVAL' } }),
      ]).then(([a, b]) => a + b),
      prisma.productVariant.count({ where: { stock: { lt: 20 }, isActive: true } }),
      prisma.product.count(),
      prisma.machine.count(),
    ]);
  const rentalRevenue = await prisma.rental.aggregate({
    _sum: { totalPaise: true },
    where: { status: { not: 'CANCELLED' } },
  });
  res.json({
    success: true,
    data: {
      farmers,
      owners,
      drivers,
      orders,
      ordersToday,
      orderRevenuePaise: revenue._sum.totalPaise || 0,
      rentalRevenuePaise: rentalRevenue._sum.totalPaise || 0,
      activeRentals,
      pendingKyc,
      lowStock,
      products,
      machines,
    },
  });
});

export const adminOrders = wrap(async (_req, res) => {
  const orders = await prisma.order.findMany({ include: ORDER_INCLUDE, orderBy: { createdAt: 'desc' }, take: 200 });
  res.json({ success: true, data: orders });
});

export const adminRentals = wrap(async (_req, res) => {
  const rentals = await prisma.rental.findMany({ include: RENTAL_INCLUDE, orderBy: { createdAt: 'desc' }, take: 200 });
  res.json({ success: true, data: rentals });
});

const ADMIN_ORDER_NEXT: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
};

export const adminUpdateOrder = wrap(async (req, res) => {
  const status = req.body.status as OrderStatus;
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: true, deliveryJob: true },
  });
  if (!order) throw new AppError(404, ErrorCode.NOT_FOUND, 'Order not found');
  if (!ADMIN_ORDER_NEXT[order.status]?.includes(status)) {
    throw new AppError(400, ErrorCode.VALIDATION_ERROR, `Cannot move order from ${order.status} to ${status}`);
  }

  if (status === 'PACKED' && order.deliveryJob && !order.deliveryJob.driverId) {
    const driver = req.body.driverId
      ? await prisma.driver.findUnique({ where: { id: req.body.driverId } })
      : await pickAvailableDriver();
    if (driver) {
      await prisma.deliveryJob.update({ where: { id: order.deliveryJob.id }, data: { driverId: driver.id } });
      await notifyUser(driver.userId, 'New delivery job', `Deliver order ${order.humanId}`, {
        jobId: order.deliveryJob.id,
      });
    }
  }

  if (status === 'CANCELLED') {
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const v = await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            variantId: v.id,
            quantity: item.quantity,
            type: 'RETURN',
            reason: `Admin cancel ${order.humanId}`,
            balanceAfter: v.stock,
            referenceId: order.humanId,
          },
        });
        broadcast('stock:updated', { variantId: v.id, productId: v.productId, stock: v.stock });
      }
      if (order.deliveryJob) {
        await tx.deliveryJob.update({ where: { id: order.deliveryJob.id }, data: { status: 'FAILED' } });
      }
    });
  }

  const updated = await setOrderStatus(order.id, status, req.user!.id, req.body.reason || `Updated by admin to ${status}`);
  res.json({ success: true, data: updated });
});

export const adminUsers = wrap(async (req, res) => {
  const { role, search } = req.query as { role?: string; search?: string };
  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role: role as any } : {}),
      ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] } : {}),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      village: true,
      district: true,
      isBlocked: true,
      createdAt: true,
      _count: { select: { orders: true, rentals: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ success: true, data: users });
});

export const adminToggleBlock = wrap(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
  if (user.role === 'ADMIN') throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Admins cannot be blocked');
  const updated = await prisma.user.update({ where: { id: user.id }, data: { isBlocked: !user.isBlocked } });
  emitToAdmins('user:updated', { id: updated.id, isBlocked: updated.isBlocked });
  res.json({ success: true, data: { id: updated.id, isBlocked: updated.isBlocked } });
});

export const adminKyc = wrap(async (_req, res) => {
  const [owners, drivers] = await Promise.all([
    prisma.ownerProfile.findMany({
      include: { user: { select: { name: true, phone: true, village: true, district: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.driver.findMany({ include: { vehicle: true }, orderBy: { createdAt: 'desc' } }),
  ]);
  const mask = (v?: string | null) => (v ? `XXXX${v.slice(-4)}` : null);
  res.json({
    success: true,
    data: {
      owners: owners.map((o) => ({ ...o, aadhaarNumber: mask(o.aadhaarNumber), bankAccountNumber: mask(o.bankAccountNumber) })),
      drivers: drivers.map((d) => ({ ...d, aadhaarNumber: mask(d.aadhaarNumber) })),
    },
  });
});

export const adminProducts = wrap(async (_req, res) => {
  const products = await prisma.product.findMany({
    include: { category: true, brand: true, variants: true, images: { take: 1 } },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: products });
});

export const adminToggleProduct = wrap(async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) throw new AppError(404, ErrorCode.NOT_FOUND, 'Product not found');
  const updated = await prisma.product.update({ where: { id: product.id }, data: { isPublished: !product.isPublished } });
  broadcast('catalog:changed', { productId: updated.id });
  res.json({ success: true, data: updated });
});

export const adminMachines = wrap(async (_req, res) => {
  const machines = await prisma.machine.findMany({
    include: { owner: { select: { name: true, phone: true } }, images: { take: 1 }, _count: { select: { rentals: true } } },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: machines });
});

export const adminDrivers = wrap(async (_req, res) => {
  const drivers = await prisma.driver.findMany({
    include: {
      vehicle: true,
      deliveryJobs: { where: { status: { notIn: ['DELIVERED', 'FAILED'] } }, select: { id: true, status: true, type: true } },
    },
  });
  res.json({ success: true, data: drivers });
});

export const adminServiceAreas = wrap(async (_req, res) => {
  const areas = await prisma.serviceArea.findMany({ orderBy: { name: 'asc' } });
  res.json({ success: true, data: areas });
});

export const adminUpsertServiceArea = wrap(async (req, res) => {
  const { name, pincode, deliveryFee = 49, freeAbove = 999, isActive = true } = req.body;
  if (!name || !pincode) throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Name and pincode are required');
  const data = {
    name,
    deliveryFeePaise: Math.round(Number(deliveryFee) * 100),
    minOrderFreeDeliveryPaise: Math.round(Number(freeAbove) * 100),
    isActive: Boolean(isActive),
  };
  const area = await prisma.serviceArea.upsert({
    where: { pincode: String(pincode) },
    create: { ...data, pincode: String(pincode) },
    update: data,
  });
  res.json({ success: true, data: area });
});

export const adminAuditLogs = wrap(async (_req, res) => {
  const logs = await prisma.auditLog.findMany({
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ success: true, data: logs });
});

export const adminCoupons = wrap(async (_req, res) => {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: coupons });
});

export const adminCreateCoupon = wrap(async (req, res) => {
  const { code, discountPercent, maxDiscount, minOrder = 0 } = req.body;
  if (!code || !discountPercent || !maxDiscount) {
    throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Code, discount percent and max discount are required');
  }
  const coupon = await prisma.coupon.create({
    data: {
      code: String(code).toUpperCase(),
      discountPercent: Number(discountPercent),
      maxDiscountPaise: Math.round(Number(maxDiscount) * 100),
      minOrderPaise: Math.round(Number(minOrder) * 100),
    },
  });
  broadcast('coupons:changed', coupon);
  res.status(201).json({ success: true, data: coupon });
});
