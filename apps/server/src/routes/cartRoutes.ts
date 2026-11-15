import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  applyCoupon,
} from '../controllers/cartController';

export const cartRoutes = Router();

cartRoutes.use(authenticate);

cartRoutes.get('/', getCart);
cartRoutes.post('/items', addToCart);
cartRoutes.put('/items/:id', updateCartItem);
cartRoutes.delete('/items/:id', removeCartItem);
cartRoutes.post('/coupon', applyCoupon);
