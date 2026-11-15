import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { ErrorCode } from '@krishi/shared';

export async function getCart(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;

    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: { take: 1, orderBy: { displayOrder: 'asc' } },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: { take: 1, orderBy: { displayOrder: 'asc' } },
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    let subtotalPaise = 0;
    let totalItems = 0;

    const formattedItems = cart.items.map((item) => {
      const lineTotalPaise = item.variant.pricePaise * item.quantity;
      subtotalPaise += lineTotalPaise;
      totalItems += item.quantity;

      return {
        id: item.id,
        variantId: item.variantId,
        productId: item.variant.productId,
        productName: item.variant.product.name,
        packSize: item.variant.packSize,
        pricePaise: item.variant.pricePaise,
        mrpPaise: item.variant.mrpPaise,
        quantity: item.quantity,
        stockAvailable: item.variant.stock,
        imageUrl: item.variant.product.images[0]?.url || '',
        lineTotalPaise,
      };
    });

    // Default delivery fee: ₹49 (4900 paise) unless over ₹999 (99900 paise)
    const freeDeliveryThreshold = 99900;
    const deliveryFeePaise = subtotalPaise >= freeDeliveryThreshold || subtotalPaise === 0 ? 0 : 4900;
    const totalPaise = subtotalPaise + deliveryFeePaise;

    return res.status(200).json({
      success: true,
      data: {
        cartId: cart.id,
        items: formattedItems,
        totalItems,
        subtotalPaise,
        deliveryFeePaise,
        totalPaise,
        freeDeliveryProgress: Math.min(100, Math.round((subtotalPaise / freeDeliveryThreshold) * 100)),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function addToCart(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { variantId, quantity = 1 } = req.body;

    if (!variantId) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Variant ID is required');
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant || !variant.isActive) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Product variant not found or unavailable');
    }

    if (variant.stock < qty) {
      throw new AppError(400, ErrorCode.INSUFFICIENT_STOCK, `Only ${variant.stock} units available in stock`);
    }

    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId,
        },
      },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + qty;
      if (variant.stock < newQty) {
        throw new AppError(400, ErrorCode.INSUFFICIENT_STOCK, `Cannot add more than ${variant.stock} available units`);
      }
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId,
          quantity: qty,
        },
      });
    }

    return getCart(req, res, next);
  } catch (err) {
    next(err);
  }
}

export async function updateCartItem(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { quantity } = req.body;

    const qty = parseInt(quantity, 10);
    if (isNaN(qty)) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Valid quantity is required');
    }

    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new AppError(404, ErrorCode.NOT_FOUND, 'Cart not found');

    const item = await prisma.cartItem.findFirst({
      where: { id, cartId: cart.id },
      include: { variant: true },
    });

    if (!item) throw new AppError(404, ErrorCode.NOT_FOUND, 'Cart item not found');

    if (qty <= 0) {
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      if (item.variant.stock < qty) {
        throw new AppError(400, ErrorCode.INSUFFICIENT_STOCK, `Only ${item.variant.stock} units available in stock`);
      }
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity: qty },
      });
    }

    return getCart(req, res, next);
  } catch (err) {
    next(err);
  }
}

export async function removeCartItem(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new AppError(404, ErrorCode.NOT_FOUND, 'Cart not found');

    await prisma.cartItem.deleteMany({
      where: { id, cartId: cart.id },
    });

    return getCart(req, res, next);
  } catch (err) {
    next(err);
  }
}

export async function applyCoupon(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.body;
    if (!code) throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Coupon code is required');

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Invalid or expired coupon code');
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'This coupon has expired');
    }

    return res.status(200).json({
      success: true,
      data: {
        code: coupon.code,
        discountPercent: coupon.discountPercent,
        maxDiscountPaise: coupon.maxDiscountPaise,
        minOrderPaise: coupon.minOrderPaise,
      },
    });
  } catch (err) {
    next(err);
  }
}
