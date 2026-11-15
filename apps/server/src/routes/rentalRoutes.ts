import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getRentalQuote,
  createRentalBooking,
  getRentals,
  getRentalById,
  rateMachineBooking,
} from '../controllers/rentalController';
import { cancelRental } from '../controllers/opsController';

export const rentalRoutes = Router();

rentalRoutes.post('/quote', authenticate, getRentalQuote);
rentalRoutes.post('/', authenticate, createRentalBooking);
rentalRoutes.get('/', authenticate, getRentals);
rentalRoutes.get('/:id', authenticate, getRentalById);
rentalRoutes.post('/:id/rate', authenticate, rateMachineBooking);
rentalRoutes.post('/:id/cancel', authenticate, cancelRental);
