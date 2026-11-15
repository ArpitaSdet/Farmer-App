import { OrderStatus, RentalStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { emitToAdmins, emitToRoom, emitToUser, notifyUser } from './events';

export const ORDER_INCLUDE = {
  items: true,
  address: true,
  user: { select: { id: true, name: true, phone: true, village: true } },
  deliveryJob: { include: { driver: { include: { vehicle: true } } } },
  statusLogs: { orderBy: { createdAt: 'asc' as const } },
};

export const RENTAL_INCLUDE = {
  machine: {
    include: {
      images: { take: 1, orderBy: { displayOrder: 'asc' as const } },
      owner: { select: { id: true, name: true, phone: true } },
    },
  },
  address: true,
  user: { select: { id: true, name: true, phone: true, village: true } },
  deliveryJob: { include: { driver: { include: { vehicle: true } } } },
  statusLogs: { orderBy: { createdAt: 'asc' as const } },
};

const ORDER_MESSAGES: Record<OrderStatus, string> = {
  PLACED: 'Your order has been placed.',
  CONFIRMED: 'Your order is confirmed and being prepared.',
  PACKED: 'Your order is packed and a delivery partner is assigned.',
  OUT_FOR_DELIVERY: 'Your order is out for delivery.',
  DELIVERED: 'Your order has been delivered. Thank you!',
  CANCELLED: 'Your order has been cancelled.',
};

const RENTAL_MESSAGES: Record<RentalStatus, string> = {
  CONFIRMED: 'Your machine booking is confirmed. Waiting for owner acceptance.',
  MACHINE_ASSIGNED: 'The owner accepted your booking. Machine is being prepared.',
  OPERATOR_ASSIGNED: 'An operator has been assigned to your booking.',
  DISPATCHED: 'Your machine has been dispatched to your farm.',
  NEAR_FARM: 'Your machine is near your farm.',
  ARRIVED: 'Your machine has arrived at your farm.',
  STARTED: 'Field work has started.',
  COMPLETED: 'Field work completed. Please rate your experience.',
  CANCELLED: 'Your machine booking has been cancelled.',
};

/** Broadcast the latest order snapshot to the farmer, the admin console and the order room. */
export async function publishOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
  if (!order) return null;
  emitToUser(order.userId, 'order:updated', order);
  emitToRoom(`order:${order.id}`, 'order:updated', order);
  emitToAdmins('order:updated', order);
  if (order.deliveryJob?.driver?.userId) {
    emitToUser(order.deliveryJob.driver.userId, 'job:updated', { jobId: order.deliveryJob.id });
  }
  return order;
}

export async function publishRental(rentalId: string) {
  const rental = await prisma.rental.findUnique({ where: { id: rentalId }, include: RENTAL_INCLUDE });
  if (!rental) return null;
  emitToUser(rental.userId, 'rental:updated', rental);
  emitToRoom(`rental:${rental.id}`, 'rental:updated', rental);
  emitToAdmins('rental:updated', rental);
  if (rental.machine.ownerId) emitToUser(rental.machine.ownerId, 'rental:updated', rental);
  if (rental.deliveryJob?.driver?.userId) {
    emitToUser(rental.deliveryJob.driver.userId, 'job:updated', { jobId: rental.deliveryJob.id });
  }
  return rental;
}

/** Move an order to a new status, log it, notify the farmer and publish live. */
export async function setOrderStatus(orderId: string, to: OrderStatus, actorId: string | null, reason?: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status === to) return publishOrder(orderId);

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: to, ...(to === 'DELIVERED' ? { paymentStatus: 'PAID' } : {}) },
    }),
    prisma.orderStatusLog.create({
      data: { orderId, fromStatus: order.status, toStatus: to, reason, actorId },
    }),
  ]);

  await notifyUser(order.userId, `Order ${order.humanId}`, ORDER_MESSAGES[to], { orderId, status: to });
  return publishOrder(orderId);
}

export async function setRentalStatus(rentalId: string, to: RentalStatus, actorId: string | null, reason?: string) {
  const rental = await prisma.rental.findUnique({ where: { id: rentalId } });
  if (!rental || rental.status === to) return publishRental(rentalId);

  await prisma.$transaction([
    prisma.rental.update({
      where: { id: rentalId },
      data: { status: to, ...(to === 'COMPLETED' ? { paymentStatus: 'PAID' } : {}) },
    }),
    prisma.rentalStatusLog.create({
      data: { rentalId, fromStatus: rental.status, toStatus: to, reason, actorId },
    }),
  ]);

  if (to === 'CANCELLED' || to === 'COMPLETED') {
    const day = new Date(rental.startDate.getFullYear(), rental.startDate.getMonth(), rental.startDate.getDate());
    await prisma.machineAvailability.updateMany({
      where: { machineId: rental.machineId, date: day },
      data: { isBooked: false },
    });
  }

  await notifyUser(rental.userId, `Booking ${rental.humanId}`, RENTAL_MESSAGES[to], { rentalId, status: to });
  return publishRental(rentalId);
}

/** Pick the first approved, available driver (demo dispatch strategy). */
export async function pickAvailableDriver() {
  return prisma.driver.findFirst({
    where: { kycStatus: 'APPROVED', isAvailable: true },
    orderBy: { createdAt: 'asc' },
  });
}
