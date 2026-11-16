import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  listAddresses,
  createAddress,
  updateAddress,
  listReviews,
  createReview,
  listCoupons,
  ownerDashboard,
  ownerCreateMachine,
  ownerUpdateMachine,
  ownerUpdateRental,
  listChatMessages,
} from '../controllers/opsController';

// Farmer-facing extras
export const addressRoutes = Router();
addressRoutes.use(authenticate);
addressRoutes.get('/', listAddresses);
addressRoutes.post('/', createAddress);
addressRoutes.put('/:id', updateAddress);

export const reviewRoutes = Router();
reviewRoutes.get('/products/:id/reviews', listReviews);
reviewRoutes.post('/products/:id/reviews', authenticate, createReview);
reviewRoutes.get('/coupons', listCoupons);

// Machine owner console
export const ownerRoutes = Router();
ownerRoutes.use(authenticate, requireRole('OWNER'));
ownerRoutes.get('/dashboard', ownerDashboard);
ownerRoutes.post('/machines', ownerCreateMachine);
ownerRoutes.patch('/machines/:id', ownerUpdateMachine);
ownerRoutes.post('/rentals/:id/status', ownerUpdateRental);

// Chat history for an order / rental room (live messages flow over Socket.IO)
export const chatRoutes = Router();
chatRoutes.get('/:room', authenticate, listChatMessages);
