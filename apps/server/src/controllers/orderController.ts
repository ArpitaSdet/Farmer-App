import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { ErrorCode } from '@krishi/shared';
import { createRazorpayOrder, createRazorpayRefund, verifyRazorpayPaymentSignature } from '../services/payment';
import { broadcast, notifyUser } from '../services/events';
import { publishOrder } from '../services/lifecycle';
import { logger } from '../config/logger';
import { env } from '../config/env';

async function generateHumanOrderId(): Promise<string> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const prefix = `ORD-${yyyy}${mm}${dd}-`;

  const countToday = await prisma.order.count({
    where: {
      humanId: { startsWith: prefix },
    },
  });

  const seq = String(countToday + 1).padStart(4, '0');
  return `${prefix}${seq}`;
}

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { addressId, paymentMethod = 'COD', couponCode, notes } = req.body;

    if (!addressId) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Delivery address is required');
    }

    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Delivery address not found');
    }

    if (!env.DEMO_MODE && (!address.latitude || !address.longitude)) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Delivery address must include valid GPS coordinates');
    }

    // Fetch user cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Your cart is empty');
    }

    const humanId = await generateHumanOrderId();

    // Perform atomic transaction: validate stock, deduct, log ledger, create order
    const result = await prisma.$transaction(async (tx) => {
      let subtotalPaise = 0;
      let totalGstPaise = 0;

      // 1. Validate & Deduct Stock with ledger entry
      for (const item of cart.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
        });

        if (!variant || !variant.isActive) {
          throw new AppError(400, ErrorCode.NOT_FOUND, `Product variant ${item.variant.product.name} is no longer available`);
        }

        if (variant.stock < item.quantity) {
          throw new AppError(
            400,
            ErrorCode.INSUFFICIENT_STOCK,
            `Insufficient stock for ${item.variant.product.name} (${item.variant.packSize}). Only ${variant.stock} remaining.`
          );
        }

        const newStock = variant.stock - item.quantity;
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: newStock },
        });

        // Record stock movement ledger entry
        await tx.stockMovement.create({
          data: {
            variantId: variant.id,
            quantity: -item.quantity,
            type: 'OUTWARD_ORDER',
            reason: `Order ${humanId}`,
            balanceAfter: newStock,
            referenceId: humanId,
          },
        });

        const lineTotal = variant.pricePaise * item.quantity;
        subtotalPaise += lineTotal;
        const lineGst = Math.round(lineTotal - lineTotal / (1 + variant.gstRate / 100));
        totalGstPaise += lineGst;
      }

      // 2. Check Service Area delivery fee
      const serviceArea = await tx.serviceArea.findUnique({
        where: { pincode: address.pincode },
      });
      const deliveryFeePaise = serviceArea
        ? subtotalPaise >= serviceArea.minOrderFreeDeliveryPaise
          ? 0
          : serviceArea.deliveryFeePaise
        : subtotalPaise >= 99900
        ? 0
        : 4900;

      // 3. Coupon Discount calculation
      let discountPaise = 0;
      if (couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { code: couponCode.toUpperCase() },
        });
        if (coupon && coupon.isActive && (!coupon.expiresAt || coupon.expiresAt > new Date())) {
          if (subtotalPaise >= coupon.minOrderPaise) {
            const rawDiscount = Math.round((subtotalPaise * coupon.discountPercent) / 100);
            discountPaise = Math.min(rawDiscount, coupon.maxDiscountPaise);
          }
        }
      }

      const totalPaise = Math.max(0, subtotalPaise + deliveryFeePaise - discountPaise);

      // 4. Create Order Record
      const order = await tx.order.create({
        data: {
          humanId,
          userId,
          addressId,
          status: 'PLACED',
          totalPaise,
          gstPaise: totalGstPaise,
          deliveryFeePaise,
          discountPaise,
          paymentMethod,
          paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
          notes,
          items: {
            create: cart.items.map((i) => ({
              variantId: i.variantId,
              productName: i.variant.product.name,
              packSize: i.variant.packSize,
              quantity: i.quantity,
              unitPricePaise: i.variant.pricePaise,
              gstRate: i.variant.gstRate,
              totalPaise: i.variant.pricePaise * i.quantity,
            })),
          },
        },
      });

      // 5. Create Order Status Log
      await tx.orderStatusLog.create({
        data: {
          orderId: order.id,
          fromStatus: 'PLACED',
          toStatus: 'PLACED',
          reason: 'Order placed by farmer',
          actorId: userId,
        },
      });

      // 6. Generate GST Invoice
      const subtotalNet = subtotalPaise - totalGstPaise;
      const cgst = Math.round(totalGstPaise / 2);
      const sgst = totalGstPaise - cgst;

      await tx.invoice.create({
        data: {
          orderId: order.id,
          invoiceNumber: `INV-${humanId.replace('ORD-', '')}`,
          hsnCode: env.DEFAULT_HSN_CODE,
          gstNumber: env.PLATFORM_GSTIN,
          subtotalPaise: subtotalNet,
          cgstPaise: cgst,
          sgstPaise: sgst,
          igstPaise: 0,
          totalPaise,
        },
      });

      // 7. Create Delivery Job
      await tx.deliveryJob.create({
        data: {
          orderId: order.id,
          type: 'ORDER_DELIVERY',
          status: 'ASSIGNED',
          pickupLat: 15.3647, // Hubballi Central Warehouse
          pickupLng: 75.124,
          dropoffLat: address.latitude,
          dropoffLng: address.longitude,
          otpHash: null,
        },
      });

      // 8. Clear Cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return order;
    });

    // 9. If Razorpay, create Gateway Order
    let razorpayOrderData = null;
    if (paymentMethod === 'RAZORPAY' && env.DEMO_MODE && !env.RAZORPAY_KEY_ID) {
      // Demo mode: simulate a successful UPI/online payment
      await prisma.$transaction([
        prisma.payment.create({
          data: { orderId: result.id, amountPaise: result.totalPaise, status: 'PAID', method: 'RAZORPAY' },
        }),
        prisma.order.update({ where: { id: result.id }, data: { paymentStatus: 'PAID' } }),
      ]);
    } else if (paymentMethod === 'RAZORPAY') {
      try {
        const rzOrder = await createRazorpayOrder(result.totalPaise, result.humanId, {
          orderId: result.id,
          userId,
        });

        await prisma.payment.create({
          data: {
            orderId: result.id,
            razorpayOrderId: rzOrder.id,
            amountPaise: result.totalPaise,
            status: 'PENDING',
            method: 'RAZORPAY',
          },
        });

        razorpayOrderData = {
          orderId: rzOrder.id,
          amountPaise: rzOrder.amount,
          currency: rzOrder.currency,
        };
      } catch (rzErr: any) {
        logger.error({ err: rzErr.message }, 'Failed to create Razorpay order');
        throw new AppError(
          503,
          ErrorCode.CONFIGURATION_ERROR,
          rzErr.message.includes('CONFIGURATION_ERROR')
            ? rzErr.message
            : `Payment gateway error: ${rzErr.message}`
        );
      }
    }

    // Live updates: stock levels for every shopper, order snapshot for farmer + admin console
    const soldVariants = await prisma.productVariant.findMany({
      where: { id: { in: cart.items.map((i) => i.variantId) } },
      select: { id: true, productId: true, stock: true },
    });
    soldVariants.forEach((v) => broadcast('stock:updated', { variantId: v.id, productId: v.productId, stock: v.stock }));
    await notifyUser(userId, `Order ${result.humanId}`, 'Your order has been placed.', { orderId: result.id });
    await publishOrder(result.id);

    return res.status(201).json({
      success: true,
      data: {
        order: result,
        razorpay: razorpayOrderData,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { status } = req.query;

    const where: any = { userId };
    if (status && typeof status === 'string') {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        address: true,
        deliveryJob: {
          include: {
            driver: {
              include: { vehicle: true },
            },
          },
        },
        statusLogs: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

export async function getOrderById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { humanId: id }],
        userId,
      },
      include: {
        items: true,
        address: true,
        invoice: true,
        deliveryJob: {
          include: {
            driver: { include: { vehicle: true } },
          },
        },
        statusLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!order) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Order not found');
    }

    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function cancelOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { reason = 'Cancelled by farmer' } = req.body;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { humanId: id }],
        userId,
      },
      include: { items: true, payments: true },
    });

    if (!order) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Order not found');
    }

    if (order.status !== 'PLACED' && order.status !== 'CONFIRMED') {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, `Order cannot be cancelled in state ${order.status}`);
    }

    // Atomic cancellation and stock restock
    await prisma.$transaction(async (tx) => {
      // 1. Advance status to CANCELLED
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });

      // 2. Status log
      await tx.orderStatusLog.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: 'CANCELLED',
          reason,
          actorId: userId,
        },
      });

      // 3. Restock inventory with ledger entry
      for (const item of order.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
        });

        if (variant) {
          const restocked = variant.stock + item.quantity;
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: restocked },
          });

          await tx.stockMovement.create({
            data: {
              variantId: variant.id,
              quantity: item.quantity,
              type: 'INWARD',
              reason: `Order Cancel Restock (${order.humanId})`,
              balanceAfter: restocked,
              referenceId: order.humanId,
            },
          });
        }
      }
    });

    // 4. Trigger refund if paid online
    const successfulPayment = order.payments.find((p) => p.status === 'PAID');
    if (successfulPayment && successfulPayment.razorpayPaymentId) {
      try {
        await createRazorpayRefund(successfulPayment.razorpayPaymentId, successfulPayment.amountPaise, reason);
        await prisma.payment.update({
          where: { id: successfulPayment.id },
          data: { status: 'REFUNDED' },
        });
      } catch (refundErr: any) {
        logger.error({ err: refundErr.message }, 'Razorpay refund attempt failed on cancel');
      }
    }

    for (const item of order.items) {
      const v = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
      if (v) broadcast('stock:updated', { variantId: v.id, productId: v.productId, stock: v.stock });
    }
    await prisma.deliveryJob.updateMany({ where: { orderId: order.id }, data: { status: 'FAILED' } });
    await notifyUser(userId, `Order ${order.humanId}`, 'Your order has been cancelled.', { orderId: order.id });
    await publishOrder(order.id);

    return res.status(200).json({
      success: true,
      data: { message: 'Order successfully cancelled and inventory restored' },
    });
  } catch (err) {
    next(err);
  }
}

export async function checkDeliverability(req: Request, res: Response, next: NextFunction) {
  try {
    const pincode = req.query.pincode as string;
    if (!pincode || pincode.length !== 6) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Valid 6-digit pincode is required');
    }

    const area = await prisma.serviceArea.findUnique({
      where: { pincode },
    });

    if (!area || !area.isActive) {
      return res.status(200).json({
        success: true,
        data: {
          isDeliverable: false,
          pincode,
          message: 'Currently delivery is not available in this pincode',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        isDeliverable: true,
        pincode: area.pincode,
        hubName: area.name,
        deliveryFeePaise: area.deliveryFeePaise,
        minOrderFreeDeliveryPaise: area.minOrderFreeDeliveryPaise,
        estimatedDeliveryDays: 2,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyOrderPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Payment verification details required');
    }

    const isValid = verifyRazorpayPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Invalid payment signature');
    }

    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { humanId: id }] },
    });
    if (!order) throw new AppError(404, ErrorCode.NOT_FOUND, 'Order not found');

    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { status: 'CONFIRMED', paymentStatus: 'PAID' },
      }),
      prisma.payment.upsert({
        where: { razorpayOrderId },
        create: {
          orderId: order.id,
          razorpayOrderId,
          razorpayPaymentId,
          amountPaise: order.totalPaise,
          method: 'RAZORPAY',
          status: 'PAID',
        },
        update: {
          razorpayPaymentId,
          status: 'PAID',
        },
      }),
      prisma.orderStatusLog.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: 'CONFIRMED',
          reason: `Verified online payment (${razorpayPaymentId})`,
        },
      }),
    ]);

    await publishOrder(order.id);
    return res.status(200).json({ success: true, data: { status: 'CONFIRMED', paymentStatus: 'PAID' } });
  } catch (err) {
    next(err);
  }
}

export async function getOrderInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { humanId: id }],
        userId,
      },
      include: {
        items: true,
        address: true,
        user: true,
        invoice: true,
      },
    });

    if (!order) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Order not found');
    }

    const invoice = order.invoice || {
      invoiceNumber: `INV-${order.humanId.replace('ORD-', '')}`,
      gstin: env.PLATFORM_GSTIN || '29AABCK1234F1Z5',
      placeOfSupply: 'Karnataka (29)',
      invoiceDate: order.createdAt,
    };

    return res.status(200).json({
      success: true,
      data: {
        invoiceNumber: invoice.invoiceNumber,
        gstin: env.PLATFORM_GSTIN || '29AABCK1234F1Z5',
        placeOfSupply: 'Karnataka (29)',
        orderHumanId: order.humanId,
        orderDate: order.createdAt,
        farmer: {
          name: order.user?.name || 'Farmer',
          phone: order.user?.phone || '',
          address: `${order.address.label || 'Farm'}, ${order.address.village}, ${order.address.district}, ${order.address.state} - ${order.address.pincode}`,
        },
        items: order.items.map((i) => ({
          productName: i.productName,
          packSize: i.packSize,
          hsnCode: env.DEFAULT_HSN_CODE || '3105',
          quantity: i.quantity,
          unitPricePaise: i.unitPricePaise,
          gstRate: i.gstRate,
          totalPaise: i.totalPaise,
        })),
        financials: {
          subtotalPaise: order.totalPaise - order.deliveryFeePaise + order.discountPaise - order.gstPaise,
          gstPaise: order.gstPaise,
          cgstPaise: Math.round(order.gstPaise / 2),
          sgstPaise: Math.round(order.gstPaise / 2),
          deliveryFeePaise: order.deliveryFeePaise,
          discountPaise: order.discountPaise,
          grandTotalPaise: order.totalPaise,
        },
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
      },
    });
  } catch (err) {
    next(err);
  }
}
