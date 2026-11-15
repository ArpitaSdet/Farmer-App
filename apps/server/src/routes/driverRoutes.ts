import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getDriverJobs,
  updateJobStatus,
  submitDriverLocation,
} from '../controllers/trackingController';
import { driverProfile, driverSetAvailability } from '../controllers/opsController';

export const driverRoutes = Router();

// Driver routes require authenticated user with DRIVER role
driverRoutes.use(authenticate, requireRole('DRIVER'));

driverRoutes.get('/jobs', getDriverJobs);
driverRoutes.post('/jobs/:id/status', updateJobStatus);
driverRoutes.post('/location', submitDriverLocation);
driverRoutes.get('/profile', driverProfile);
driverRoutes.post('/availability', driverSetAvailability);
