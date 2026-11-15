import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env, assertEnv } from '../config/env';
import { logger } from '../config/logger';

let razorpayInstance: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  if (razorpayInstance) return razorpayInstance;

  const keyId = assertEnv('RAZORPAY_KEY_ID', 'Razorpay Payment Gateway');
  const keySecret = assertEnv('RAZORPAY_KEY_SECRET', 'Razorpay Payment Gateway');

  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayInstance;
}

export async function createRazorpayOrder(amountPaise: number, receiptId: string, notes: Record<string, string> = {}) {
  const client = getRazorpayClient();
  const order = await client.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: receiptId,
    notes,
  });
  logger.info({ orderId: order.id, receiptId, amountPaise }, 'Razorpay Order created');
  return order;
}

export function verifyRazorpayPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const keySecret = assertEnv('RAZORPAY_KEY_SECRET', 'Razorpay Payment Gateway');
  const generatedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return generatedSignature === signature;
}

export function verifyWebhookSignature(bodyRaw: string, signatureHeader: string): boolean {
  const webhookSecret = assertEnv('RAZORPAY_WEBHOOK_SECRET', 'Razorpay Webhook Verification');
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(bodyRaw)
    .digest('hex');

  return expectedSignature === signatureHeader;
}

export async function createRazorpayRefund(paymentId: string, amountPaise: number, reason = 'Customer cancellation') {
  const client = getRazorpayClient();
  const refund = await client.payments.refund(paymentId, {
    amount: amountPaise,
    notes: { reason },
  });
  logger.info({ refundId: refund.id, paymentId, amountPaise }, 'Razorpay Refund processed');
  return refund;
}
