import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getTrackingSnapshot } from '../controllers/trackingController';

export const trackingRoutes = Router();

trackingRoutes.get('/:jobId', authenticate, getTrackingSnapshot);
