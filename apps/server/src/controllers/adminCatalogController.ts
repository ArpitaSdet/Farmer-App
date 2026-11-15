import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { broadcast } from '../services/events';
import { AppError } from '../middleware/errorHandler';
import { ErrorCode } from '@krishi/shared';
import { env, assertEnv } from '../config/env';

// TODO [Phase 6 - Multi-Vendor Marketplace]: Implement vendor tenant isolation, seller KYC & Razorpay Route automated commissions in v2.0

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, slug, iconUrl, displayOrder } = req.body;
    if (!name || !slug) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Category name and slug are required');
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
        iconUrl,
        displayOrder: displayOrder || 0,
      },
    });

    return res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      name,
      slug,
      description,
      categoryId,
      brandId,
      suitableCrops,
      safetyInfo,
      variants,
      images,
    } = req.body;

    if (!name || !categoryId || !variants || !Array.isArray(variants) || variants.length === 0) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Name, category, and at least one variant are required');
    }

    const generatedSlug = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const product = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          name,
          slug: generatedSlug,
          description: description || '',
          categoryId,
          brandId: brandId || null,
          suitableCrops: suitableCrops || [],
          safetyInfo: safetyInfo || null,
        },
      });

      // Create variants
      for (const v of variants) {
        const variant = await tx.productVariant.create({
          data: {
            productId: prod.id,
            packSize: v.packSize,
            sku: v.sku || `${generatedSlug}-${v.packSize.toLowerCase().replace(/\s+/g, '')}`,
            pricePaise: Math.round(Number(v.priceRupees || v.pricePaise / 100) * 100),
            mrpPaise: Math.round(Number(v.mrpRupees || v.mrpPaise / 100) * 100),
            gstRate: v.gstRate || 18.0,
            stock: v.stock || 0,
          },
        });

        // Record initial inward stock movement
        if (v.stock > 0) {
          await tx.stockMovement.create({
            data: {
              variantId: variant.id,
              quantity: v.stock,
              type: 'INWARD',
              reason: 'Initial Product Stock Inward',
              balanceAfter: v.stock,
            },
          });
        }
      }

      // Create images if provided
      if (images && Array.isArray(images)) {
        for (let i = 0; i < images.length; i++) {
          await tx.productImage.create({
            data: {
              productId: prod.id,
              url: images[i].url || images[i],
              thumbnailUrl: images[i].thumbnailUrl || null,
              displayOrder: i,
            },
          });
        }
      }

      return prod;
    });

    return res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function adjustStock(req: Request, res: Response, next: NextFunction) {
  try {
    const { variantId, quantity, type, reason } = req.body;
    if (!variantId || quantity === undefined || !reason) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'VariantId, quantity, and reason are required');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant) {
        throw new AppError(404, ErrorCode.NOT_FOUND, 'Product variant not found');
      }

      const qtyDelta = parseInt(quantity, 10);
      const newStock = variant.stock + qtyDelta;

      if (newStock < 0) {
        throw new AppError(400, ErrorCode.INSUFFICIENT_STOCK, 'Stock cannot be negative');
      }

      const updatedVariant = await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: newStock },
      });

      await tx.stockMovement.create({
        data: {
          variantId,
          quantity: qtyDelta,
          type: type || 'ADJUSTMENT_AUDIT',
          reason,
          balanceAfter: newStock,
        },
      });

      return updatedVariant;
    });

    broadcast('stock:updated', { variantId: updated.id, productId: updated.productId, stock: updated.stock });
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function createMachine(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      name,
      type,
      description,
      hourlyRateRupees,
      dailyRateRupees,
      operatorAvailable = true,
      latitude,
      longitude,
      images,
    } = req.body;

    if (!name || !type || !hourlyRateRupees || !latitude || !longitude) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Name, type, hourly rate, and GPS location are required');
    }

    const machine = await prisma.$transaction(async (tx) => {
      const m = await tx.machine.create({
        data: {
          name,
          type,
          description: description || '',
          hourlyRatePaise: Math.round(Number(hourlyRateRupees) * 100),
          dailyRatePaise: Math.round(Number(dailyRateRupees || hourlyRateRupees * 8) * 100),
          operatorAvailable: Boolean(operatorAvailable),
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        },
      });

      if (images && Array.isArray(images)) {
        for (let i = 0; i < images.length; i++) {
          await tx.machineImage.create({
            data: {
              machineId: m.id,
              url: images[i].url || images[i],
              viewType: images[i].viewType || 'front',
              displayOrder: i,
            },
          });
        }
      }

      return m;
    });

    return res.status(201).json({ success: true, data: machine });
  } catch (err) {
    next(err);
  }
}

export async function createSignedUploadUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const { filename, contentType } = req.body;
    if (!filename || !contentType) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'filename and contentType are required');
    }

    // Verify S3 credentials exist; if not, throw ConfigurationError per Section 16 non-negotiables
    assertEnv('S3_BUCKET_NAME', 'S3/R2 Cloud Storage');
    assertEnv('S3_ACCESS_KEY_ID', 'S3/R2 Cloud Storage');
    assertEnv('S3_SECRET_ACCESS_KEY', 'S3/R2 Cloud Storage');

    const key = `uploads/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const uploadUrl = `https://${env.S3_BUCKET_NAME}.s3.${env.S3_REGION || 'ap-south-1'}.amazonaws.com/${key}`;

    return res.status(200).json({
      success: true,
      data: {
        uploadUrl,
        key,
        publicUrl: env.S3_PUBLIC_CDN_URL ? `${env.S3_PUBLIC_CDN_URL}/${key}` : uploadUrl,
      },
    });
  } catch (err) {
    next(err);
  }
}
