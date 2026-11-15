import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  registerDeviceToken,
} from '../controllers/notificationController';

export const notificationRoutes = Router();

notificationRoutes.use(authenticate);

notificationRoutes.post('/device-token', registerDeviceToken);
notificationRoutes.get('/', getMyNotifications);
notificationRoutes.patch('/:id/read', markAsRead);
notificationRoutes.put('/:id/read', markAsRead);
notificationRoutes.post('/read-all', markAllAsRead);
notificationRoutes.put('/read-all', markAllAsRead);
