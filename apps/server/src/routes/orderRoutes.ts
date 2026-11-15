import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  checkDeliverability,
  getOrderInvoice,
} from '../controllers/orderController';

export const orderRoutes = Router();

orderRoutes.use(authenticate);

orderRoutes.get('/deliverability', checkDeliverability);
orderRoutes.post('/', createOrder);
orderRoutes.get('/', getOrders);
orderRoutes.get('/:id', getOrderById);
orderRoutes.get('/:id/invoice', getOrderInvoice);
orderRoutes.post('/:id/cancel', cancelOrder);
