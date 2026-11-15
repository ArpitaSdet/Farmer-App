import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

async function seedCatalog() {
  console.log('\n======================================================');
  console.log('       KRISHI: Seeding Production Catalog Data        ');
  console.log('======================================================\n');

  try {
    const dbJsonPath = path.resolve(__dirname, '../../../../backend/data/db.json');
    if (!fs.existsSync(dbJsonPath)) {
      throw new Error(`Catalog source file not found at ${dbJsonPath}`);
    }

    const rawData = JSON.parse(fs.readFileSync(dbJsonPath, 'utf-8'));
    const { categories = [], products = [], machines = [], banners = [], posters = [] } = rawData;

    console.log(`📦 Loaded ${categories.length} categories, ${products.length} products, ${machines.length} machines from master catalog.`);

    // 1. Seed Categories
    console.log('🌱 Upserting Categories...');
    const categoryMap = new Map<string, string>(); // slug -> id

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      const slug = (cat.slug || cat.id).toLowerCase();
      const upserted = await prisma.category.upsert({
        where: { slug },
        update: {
          name: cat.name,
          iconUrl: cat.icon || null,
          displayOrder: i,
          isActive: true,
        },
        create: {
          name: cat.name,
          slug,
          iconUrl: cat.icon || null,
          displayOrder: i,
          isActive: true,
        },
      });
      categoryMap.set(slug, upserted.id);
      categoryMap.set(cat.id, upserted.id);
    }

    // 2. Seed Products & Variants (Prices strictly stored in paise: integers)
    console.log('🌾 Upserting Products & Variants...');
    for (const prod of products) {
      const categoryId = categoryMap.get(prod.category) || Array.from(categoryMap.values())[0];
      const slug = (prod.id || prod.name).toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const existingProd = await prisma.product.findUnique({ where: { slug } });
      let productId = existingProd?.id;

      if (!existingProd) {
        const created = await prisma.product.create({
          data: {
            name: prod.name,
            slug,
            description: prod.description || '',
            categoryId,
            suitableCrops: prod.suitableCrops || (prod.crop ? [prod.crop] : []),
            safetyInfo: prod.safetyInstructions || null,
            isPublished: true,
          },
        });
        productId = created.id;
      }

      // Upsert Product Variants (pack sizes & prices)
      const variants = prod.variants && prod.variants.length > 0
        ? prod.variants
        : [
            {
              packSize: prod.unit || '1 Pack',
              sku: `${slug}-std`,
              price: prod.price || 500,
              mrp: prod.mrp || (prod.price ? prod.price * 1.2 : 600),
              stock: prod.stock || 50,
            },
          ];

      for (const v of variants) {
        const sku = v.sku || `${slug}-${(v.packSize || 'unit').toLowerCase().replace(/\s+/g, '')}`;
        const pricePaise = Math.round(Number(v.price) * 100);
        const mrpPaise = Math.round(Number(v.mrp || v.price * 1.2) * 100);
        const stock = v.stock !== undefined ? parseInt(v.stock, 10) : 50;

        const variant = await prisma.productVariant.upsert({
          where: { sku },
          update: {
            pricePaise,
            mrpPaise,
            stock,
            isActive: true,
          },
          create: {
            productId: productId!,
            packSize: v.packSize || '1 Unit',
            sku,
            pricePaise,
            mrpPaise,
            stock,
            isActive: true,
          },
        });

        // Record stock ledger entry if none exists
        const existingMovement = await prisma.stockMovement.findFirst({
          where: { variantId: variant.id },
        });

        if (!existingMovement) {
          await prisma.stockMovement.create({
            data: {
              variantId: variant.id,
              quantity: stock,
              type: 'INWARD',
              reason: 'Initial Catalog Seed Inward',
              balanceAfter: stock,
            },
          });
        }
      }

      // Upsert Product Images
      if (prod.image) {
        const existingImg = await prisma.productImage.findFirst({
          where: { productId, url: prod.image },
        });
        if (!existingImg) {
          await prisma.productImage.create({
            data: {
              productId: productId!,
              url: prod.image,
              thumbnailUrl: prod.thumbnail || prod.image,
              displayOrder: 0,
            },
          });
        }
      }
    }

    // 3. Seed Machinery
    console.log('🚜 Upserting Machinery with GPS Coordinates & Rates...');
    for (const m of machines) {
      const existing = await prisma.machine.findFirst({
        where: { name: m.name },
      });

      const hourlyRatePaise = Math.round(Number(m.hourlyRate || 800) * 100);
      const dailyRatePaise = Math.round(Number(m.dailyRate || m.hourlyRate * 8 || 6400) * 100);

      const lat = m.location?.coordinates?.[1] || m.latitude || 15.3647;
      const lng = m.location?.coordinates?.[0] || m.longitude || 75.124;

      let machineId = existing?.id;
      if (!existing) {
        const created = await prisma.machine.create({
          data: {
            name: m.name,
            type: m.type || 'Tractor',
            description: m.description || `${m.name} available for farm rental with certified operator.`,
            hourlyRatePaise,
            dailyRatePaise,
            operatorAvailable: m.operatorIncluded !== false,
            latitude: lat,
            longitude: lng,
            rating: m.rating || 4.8,
            isAvailable: true,
          },
        });
        machineId = created.id;
      }

      if (m.image && machineId) {
        const existingImg = await prisma.machineImage.findFirst({
          where: { machineId, url: m.image },
        });
        if (!existingImg) {
          await prisma.machineImage.create({
            data: {
              machineId,
              url: m.image,
              viewType: 'front',
              displayOrder: 0,
            },
          });
        }
      }
    }

    // 4. Seed Banners & Posters
    console.log('🎨 Upserting Promotional Banners & Posters...');
    for (let i = 0; i < banners.length; i++) {
      const b = banners[i];
      const existing = await prisma.banner.findFirst({ where: { title: b.title } });
      if (!existing) {
        await prisma.banner.create({
          data: {
            title: b.title,
            imageUrl: b.image || b.imageUrl || '',
            targetScreen: b.targetScreen || 'Shop',
            displayOrder: i,
            isActive: true,
          },
        });
      }
    }

    for (const p of posters) {
      const existing = await prisma.banner.findFirst({ where: { title: p.title } });
      if (!existing) {
        await prisma.banner.create({
          data: {
            title: p.title,
            imageUrl: p.image || p.imageUrl || '',
            isActive: true,
          },
        });
      }
    }

    // 5. Seed Core Service Areas (Pincodes around Karnataka / India with delivery rules)
    console.log('📍 Initializing Service Areas...');
    const defaultPincodes = [
      { pincode: '580020', name: 'Hubballi Urban', fee: 4900, freeAbove: 99900 },
      { pincode: '580031', name: 'Unkal Rural', fee: 4900, freeAbove: 99900 },
      { pincode: '580023', name: 'Byahatti', fee: 6900, freeAbove: 149900 },
      { pincode: '582208', name: 'Navalgund', fee: 8900, freeAbove: 149900 },
      { pincode: '560001', name: 'Bangalore Central', fee: 4900, freeAbove: 99900 },
    ];

    for (const sa of defaultPincodes) {
      await prisma.serviceArea.upsert({
        where: { pincode: sa.pincode },
        update: {
          name: sa.name,
          deliveryFeePaise: sa.fee,
          minOrderFreeDeliveryPaise: sa.freeAbove,
          isActive: true,
        },
        create: {
          pincode: sa.pincode,
          name: sa.name,
          deliveryFeePaise: sa.fee,
          minOrderFreeDeliveryPaise: sa.freeAbove,
          isActive: true,
        },
      });
    }

    console.log('\n✅ Catalog successfully seeded into PostgreSQL!');
    console.log('   All prices stored in paise (integers).');
    console.log('   All stock ledger entries initialized.\n');
  } catch (err: any) {
    logger.error({ err }, 'Failed to seed catalog');
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedCatalog();
}
