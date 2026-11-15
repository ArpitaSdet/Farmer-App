import { Router } from 'express';
import { handleRazorpayWebhook } from '../controllers/webhookController';

export const webhookRoutes = Router();

// Razorpay sends webhooks to POST /webhooks/razorpay
webhookRoutes.post('/razorpay', handleRazorpayWebhook);
