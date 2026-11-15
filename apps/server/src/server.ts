import http from 'http';
import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { AuthTokenPayload } from '@krishi/shared';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { redisClient } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/authRoutes';
import { catalogRoutes } from './routes/catalogRoutes';
import { adminRoutes } from './routes/adminRoutes';
import { cartRoutes } from './routes/cartRoutes';
import { orderRoutes } from './routes/orderRoutes';
import { webhookRoutes } from './routes/webhookRoutes';
import { rentalRoutes } from './routes/rentalRoutes';
import { driverRoutes } from './routes/driverRoutes';
import { trackingRoutes } from './routes/trackingRoutes';
import { supportRoutes } from './routes/supportRoutes';
import { notificationRoutes } from './routes/notificationRoutes';
import { addressRoutes, reviewRoutes, ownerRoutes, chatRoutes } from './routes/opsRoutes';
import { marketRoutes } from './routes/marketRoutes';
import { checkRoomAccess, getOnlineDriversTelemetry } from './services/realtimeService';
import { registerIo } from './services/events';
import { marketService } from './services/marketService';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with 25s heartbeat ping and 20s timeout
export const io = new SocketIOServer(server, {
  pingInterval: 25000,
  pingTimeout: 20000,
  cors: {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

registerIo(io);

// Setup Redis adapter for Socket.IO horizontal clustering if Redis is connected and ready
if (redisClient && process.env.NODE_ENV !== 'test') {
  redisClient.on('connect', () => {
    try {
      const pubClient = redisClient!;
      const subClient = pubClient.duplicate();
      subClient.on('error', (err) => {
        logger.warn({ err: err.message }, 'Redis subClient warning');
      });
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.IO Redis adapter attached');
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Socket.IO running in standalone in-memory mode');
    }
  });
}

// Global Security & Logging Middlewares
// CSP disabled: the same server also hosts the admin SPA and the Expo web build
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) =>
        req.url === '/health' || req.url === '/ready' || req.url === '/health/realtime',
    },
  })
);

// Global Rate Limiting (200 req per minute per IP)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests from this IP, please try again in a minute.',
    },
  },
});
app.use(globalLimiter);

// Health & Readiness Probes
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/ready', async (_req, res) => {
  try {
    // Check DB
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ready', database: 'connected' });
  } catch (err: any) {
    res.status(503).json({ status: 'not_ready', error: err.message });
  }
});

// Real-Time Health & Telemetry Probe
app.get('/health/realtime', async (_req, res) => {
  try {
    const socketsCount = io.sockets.sockets.size;
    const rooms: string[] = [];
    io.sockets.adapter.rooms.forEach((_val, roomName) => {
      // Exclude private socket ID rooms
      if (!io.sockets.sockets.has(roomName)) {
        rooms.push(roomName);
      }
    });

    const onlineDrivers = await getOnlineDriversTelemetry();

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      connectedSockets: socketsCount,
      activeRoomsCount: rooms.length,
      activeRooms: rooms,
      onlineDriversCount: onlineDrivers.length,
      onlineDrivers,
      redisConnected: redisClient ? redisClient.status === 'ready' || redisClient.status === 'connect' : false,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Mount API v1 Routes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/cart', cartRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/rentals', rentalRoutes);
apiRouter.use('/driver', driverRoutes);
apiRouter.use('/tracking', trackingRoutes);
apiRouter.use('/support', supportRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/webhooks', webhookRoutes);
apiRouter.use('/addresses', addressRoutes);
apiRouter.use('/owner', ownerRoutes);
apiRouter.use('/chat', chatRoutes);
apiRouter.use('/market', marketRoutes);
apiRouter.use('/', reviewRoutes);
apiRouter.use('/', catalogRoutes);
apiRouter.use('/admin', adminRoutes);

apiRouter.use('/config', (_req, res) => {
  res.status(200).json({ success: true, data: { demoMode: env.DEMO_MODE } });
});

app.use(env.API_PREFIX, apiRouter);
app.use('/api', apiRouter);

// Static hosting: product/machine images, admin console and the farmer web app (when built)
const repoRoot = path.resolve(__dirname, '../../..');
app.use('/assets', express.static(path.join(repoRoot, 'assets'), { maxAge: '7d' }));

const adminDist = path.join(repoRoot, 'apps/admin/dist');
if (fs.existsSync(adminDist)) {
  app.use('/admin', express.static(adminDist));
  app.get('/admin/*', (_req, res) => res.sendFile(path.join(adminDist, 'index.html')));
}

const webDist = path.join(repoRoot, 'frontend/dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^\/(?!api|admin|assets|socket\.io|health|ready).*/, (_req, res) =>
    res.sendFile(path.join(webDist, 'index.html'))
  );
}

// API 404s return JSON instead of HTML
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

// Global Error Handler
app.use(errorHandler);

// Socket.IO Handshake Authentication Middleware
io.use(async (socket, next) => {
  try {
    const rawToken =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.slice(7)
        : null);

    if (!rawToken) {
      // In test mode or when unauthenticated connection is allowed for public broadcasts
      if (process.env.NODE_ENV === 'test' && !socket.handshake.auth?.requireAuth) {
        return next();
      }
      return next(new Error('AUTHENTICATION_REQUIRED'));
    }

    const decoded = jwt.verify(rawToken, env.JWT_ACCESS_SECRET) as AuthTokenPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, phone: true, role: true, isBlocked: true },
    });

    if (!user) {
      return next(new Error('USER_NOT_FOUND'));
    }

    if (user.isBlocked) {
      return next(new Error('USER_BLOCKED'));
    }

    socket.data.user = {
      id: user.id,
      phone: user.phone,
      role: user.role,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new Error('TOKEN_EXPIRED'));
    }
    return next(new Error('AUTHENTICATION_FAILED'));
  }
});

// Socket.IO Event Handlers
io.on('connection', (socket) => {
  const user = socket.data.user;
  logger.info({ socketId: socket.id, user: user ? { id: user.id, role: user.role } : 'anonymous' }, 'Socket client connected');

  // Personal rooms so controllers can push updates without the client joining manually
  socket.join('catalog');
  if (user) {
    socket.join(`user:${user.id}`);
    if (user.role === 'ADMIN') socket.join('admin');
    if (user.role === 'OWNER') socket.join(`owner:${user.id}`);
  }

  // Re-authenticate when access token refreshes without dropping the socket connection
  socket.on('auth:refresh', async (data: { token: string }, callback) => {
    try {
      if (!data?.token) {
        socket.emit('auth:error', { code: 'TOKEN_REQUIRED', message: 'Token is required' });
        if (callback) callback({ success: false, error: 'TOKEN_REQUIRED' });
        return;
      }

      const decoded = jwt.verify(data.token, env.JWT_ACCESS_SECRET) as AuthTokenPayload;
      const refreshedUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, phone: true, role: true, isBlocked: true },
      });

      if (!refreshedUser || refreshedUser.isBlocked) {
        socket.emit('auth:error', { code: 'USER_INVALID', message: 'User invalid or blocked' });
        if (callback) callback({ success: false, error: 'USER_INVALID' });
        return;
      }

      socket.data.user = {
        id: refreshedUser.id,
        phone: refreshedUser.phone,
        role: refreshedUser.role,
      };

      socket.emit('auth:refreshed', { userId: refreshedUser.id, role: refreshedUser.role });
      if (callback) callback({ success: true, user: socket.data.user });
    } catch (err: any) {
      const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
      socket.emit('auth:error', { code, message: err.message });
      if (callback) callback({ success: false, error: code });
    }
  });

  // Secure room joining: Rooms: order:{orderId}, rental:{bookingId}, driver:{driverId}, owner:{ownerId}, admin
  socket.on(
    'room:join',
    async (roomName: string, callback?: (res: { success: boolean; error?: string }) => void) => {
      const currentUser = socket.data.user;
      if (!currentUser) {
        socket.emit('room:error', { room: roomName, error: 'UNAUTHENTICATED' });
        if (callback) callback({ success: false, error: 'UNAUTHENTICATED' });
        return;
      }

      const isAllowed = await checkRoomAccess(currentUser, roomName);
      if (!isAllowed) {
        logger.warn(
          { socketId: socket.id, userId: currentUser.id, room: roomName },
          'Unauthorized room join attempt rejected'
        );
        socket.emit('room:error', { room: roomName, error: 'FORBIDDEN' });
        if (callback) callback({ success: false, error: 'FORBIDDEN' });
        return;
      }

      socket.join(roomName);
      logger.info({ socketId: socket.id, userId: currentUser.id, room: roomName }, 'User joined room');
      if (callback) callback({ success: true });
    }
  );

  socket.on('room:leave', (roomName: string) => {
    socket.leave(roomName);
    logger.info({ socketId: socket.id, room: roomName }, 'User left room');
  });

  // Real-time chat within rooms the user is authorised for (order:{id}, rental:{id}); persisted for history
  socket.on('chat:message', async (data: { roomId: string; text: string }, callback?: (res: any) => void) => {
    const currentUser = socket.data.user;
    const text = typeof data?.text === 'string' ? data.text.trim().slice(0, 1000) : '';
    if (!currentUser || !data?.roomId || !text) return;
    if (!(await checkRoomAccess(currentUser, data.roomId))) {
      if (callback) callback({ success: false, error: 'FORBIDDEN' });
      return;
    }
    socket.join(data.roomId);
    const sender = await prisma.user.findUnique({ where: { id: currentUser.id }, select: { name: true } });
    const message = await prisma.chatMessage.create({
      data: {
        room: data.roomId,
        senderId: currentUser.id,
        senderName: sender?.name,
        senderRole: currentUser.role,
        text,
      },
    });
    io.to(data.roomId).emit('chat:message', message);
    if (callback) callback({ success: true, message });
  });

  // Legacy room support for backward compatibility with existing tests & endpoints
  socket.on('join_job', async (jobId: string) => {
    if (socket.data.user && (await checkRoomAccess(socket.data.user, `job:${jobId}`))) {
      socket.join(`job:${jobId}`);
    }
  });

  socket.on('leave_job', (jobId: string) => {
    socket.leave(`job:${jobId}`);
  });

  socket.on('join_order_room', async (orderId: string) => {
    if (socket.data.user && (await checkRoomAccess(socket.data.user, `order:${orderId}`))) {
      socket.join(`order:${orderId}`);
    }
  });

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Socket client disconnected');
  });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  server.listen(env.PORT, () => {
    logger.info(`🚀 KRISHI Server running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`📡 API available at http://localhost:${env.PORT}${env.API_PREFIX}`);
    marketService.startPeriodicBroadcast();
  });
}

export { app, server };
