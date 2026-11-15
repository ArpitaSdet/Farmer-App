import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { ErrorCode } from '@krishi/shared';

export async function getCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    return res.status(200).json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      search,
      category,
      brand,
      crop,
      minPrice,
      maxPrice,
      sort = 'popular',
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { isPublished: true };

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category && typeof category === 'string') {
      where.category = {
        OR: [{ id: category }, { slug: category }],
      };
    }

    if (brand && typeof brand === 'string') {
      where.brandId = brand;
    }

    if (crop && typeof crop === 'string') {
      where.suitableCrops = { has: crop };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price_asc') {
      orderBy = { variants: { _count: 'asc' } };
    } else if (sort === 'price_desc') {
      orderBy = { variants: { _count: 'desc' } };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          brand: true,
          variants: { where: { isActive: true } },
          images: { orderBy: { displayOrder: 'asc' } },
          reviews: { select: { rating: true } },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.product.count({ where }),
    ]);

    const formatted = products.map((p) => {
      const avgRating =
        p.reviews.length > 0
          ? Number((p.reviews.reduce((acc, r) => acc + r.rating, 0) / p.reviews.length).toFixed(1))
          : 4.8;
      return {
        ...p,
        rating: avgRating,
        reviewCount: p.reviews.length,
      };
    });

    return res.status(200).json({
      success: true,
      data: formatted,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isPublished: true,
      },
      include: {
        category: true,
        brand: true,
        variants: { where: { isActive: true } },
        images: { orderBy: { displayOrder: 'asc' } },
        reviews: {
          include: {
            user: { select: { name: true, village: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Product not found');
    }

    const avgRating =
      product.reviews.length > 0
        ? Number((product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length).toFixed(1))
        : 4.8;

    return res.status(200).json({
      success: true,
      data: {
        ...product,
        rating: avgRating,
        reviewCount: product.reviews.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export async function getMachines(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, lat, lng, search, operatorAvailable, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { isAvailable: true };
    if (type && typeof type === 'string' && type !== 'all') {
      where.type = { equals: type, mode: 'insensitive' };
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
        { village: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (operatorAvailable === 'true') where.operatorAvailable = true;

    const [machines, total] = await Promise.all([
      prisma.machine.findMany({
        where,
        include: {
          images: { orderBy: { displayOrder: 'asc' } },
          owner: { select: { name: true, phone: true } },
        },
        skip,
        take: limitNum,
      }),
      prisma.machine.count({ where }),
    ]);

    const userLat = lat ? parseFloat(lat as string) : null;
    const userLng = lng ? parseFloat(lng as string) : null;

    let formatted = machines.map((m) => {
      let distanceKm = 4.2; // default district proximity
      if (userLat !== null && userLng !== null && !isNaN(userLat) && !isNaN(userLng)) {
        distanceKm = calculateDistanceKm(userLat, userLng, m.latitude, m.longitude);
      }
      return {
        ...m,
        distanceKm,
      };
    });

    if (userLat !== null && userLng !== null) {
      formatted.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    return res.status(200).json({
      success: true,
      data: formatted,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMachineById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const machine = await prisma.machine.findUnique({
      where: { id },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        availabilities: {
          where: { date: { gte: new Date() } },
          take: 30,
        },
      },
    });

    if (!machine) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Machinery not found');
    }

    return res.status(200).json({
      success: true,
      data: machine,
    });
  } catch (err) {
    next(err);
  }
}

export async function getBanners(req: Request, res: Response, next: NextFunction) {
  try {
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    return res.status(200).json({ success: true, data: banners });
  } catch (err) {
    next(err);
  }
}

export async function getPosters(req: Request, res: Response, next: NextFunction) {
  try {
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    return res.status(200).json({ success: true, data: banners });
  } catch (err) {
    next(err);
  }
}

export async function getHomeFeed(req: Request, res: Response, next: NextFunction) {
  try {
    const [banners, categories, featuredProducts, availableMachines] = await Promise.all([
      prisma.banner.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.product.findMany({
        where: { isPublished: true },
        include: {
          category: true,
          variants: { where: { isActive: true } },
          images: { orderBy: { displayOrder: 'asc' } },
        },
        take: 8,
      }),
      prisma.machine.findMany({
        where: { isAvailable: true },
        include: {
          images: { orderBy: { displayOrder: 'asc' } },
          owner: { select: { name: true, phone: true } },
        },
        take: 6,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        banners,
        categories,
        featuredProducts,
        featuredMachines: availableMachines,
      },
    });
  } catch (err) {
    next(err);
  }
}
