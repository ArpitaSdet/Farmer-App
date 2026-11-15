import type { Server as SocketIOServer } from 'socket.io';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

/**
 * Central real-time event bus. server.ts registers the Socket.IO instance;
 * controllers publish through these helpers instead of importing `io` directly.
 *
 * Rooms joined automatically on connect:
 *   user:{userId}  - every authenticated socket
 *   admin          - ADMIN users
 *   owner:{userId} - OWNER users
 *   catalog        - every socket (public stock / availability updates)
 */
let ioRef: SocketIOServer | null = null;

export function registerIo(io: SocketIOServer) {
  ioRef = io;
}

export function emitToUser(userId: string | null | undefined, event: string, payload: unknown) {
  if (!ioRef || !userId) return;
  ioRef.to(`user:${userId}`).emit(event, payload);
}

export function emitToAdmins(event: string, payload: unknown) {
  ioRef?.to('admin').emit(event, payload);
}

export function emitToRoom(room: string, event: string, payload: unknown) {
  ioRef?.to(room).emit(event, payload);
}

export function broadcast(event: string, payload: unknown) {
  ioRef?.emit(event, payload);
}

/**
 * Persist an in-app notification and push it live over the user's socket room.
 */
export async function notifyUser(
  userId: string | null | undefined,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
) {
  if (!userId) return;
  try {
    const notification = await prisma.notification.create({
      data: { userId, title, body, dataJson: data as any },
    });
    emitToUser(userId, 'notification:new', notification);
  } catch (err: any) {
    logger.warn({ err: err.message, userId }, 'Failed to create notification');
  }
}
