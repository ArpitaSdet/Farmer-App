import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { verifyWebhookSignature } from '../services/payment';
import { publishOrder } from '../services/lifecycle';
import { logger } from '../config/logger';

export async function handleRazorpayWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      logger.warn('Razorpay webhook called without signature header');
      return res.status(400).json({ success: false, message: 'Missing signature header' });
    }

    const rawBody = JSON.stringify(req.body);
    const isValid = verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      logger.error('Invalid Razorpay webhook signature');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    logger.info({ event }, 'Processing Razorpay webhook event');

    // 1. Payment Captured / Order Paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payment?.entity;
      const rzOrderId = paymentEntity?.order_id;
      const rzPaymentId = paymentEntity?.id;

      if (rzOrderId) {
        const paymentRecord = await prisma.payment.findUnique({
          where: { razorpayOrderId: rzOrderId },
        });

        if (paymentRecord && paymentRecord.status !== 'PAID') {
          await prisma.$transaction([
            prisma.payment.update({
              where: { id: paymentRecord.id },
              data: {
                status: 'PAID',
                razorpayPaymentId: rzPaymentId,
              },
            }),
            prisma.order.update({
              where: { id: paymentRecord.orderId! },
              data: {
                status: 'CONFIRMED',
                paymentStatus: 'PAID',
              },
            }),
            prisma.orderStatusLog.create({
              data: {
                orderId: paymentRecord.orderId!,
                fromStatus: 'PLACED',
                toStatus: 'CONFIRMED',
                reason: `Payment verified online via Razorpay (${rzPaymentId})`,
              },
            }),
          ]);

          await publishOrder(paymentRecord.orderId!);

          logger.info({ orderId: paymentRecord.orderId }, 'Order marked CONFIRMED via webhook');
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error processing Razorpay webhook');
    return res.status(500).json({ success: false, error: err.message });
  }
}
