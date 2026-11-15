/**
 * Demo data seed: users for every role, catalog, machinery, coupons, FAQs and sample orders/rentals.
 *
 *   npm run seed:demo            -> seeds only when the database has no products
 *   npm run seed:demo -- --reset -> wipes all data and seeds again
 *
 * Demo logins (OTP is always 123456 while DEMO_MODE=true):
 *   Farmer 9876543210 | Owner 9845000001 | Driver 9900000001 | Admin web admin@kisankendra.in / Admin@123
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';

const img = (p: string) => `/assets/${p}`;
const paise = (rupees: number) => Math.round(rupees * 100);

const CATEGORIES = [
  { slug: 'seeds', name: 'Seeds', icon: '🌱' },
  { slug: 'fertilizers', name: 'Fertilizers', icon: '🧪' },
  { slug: 'crop-protection', name: 'Crop Protection', icon: '🛡️' },
  { slug: 'irrigation', name: 'Irrigation', icon: '💧' },
  { slug: 'sprayers', name: 'Sprayers', icon: '🚿' },
  { slug: 'tools', name: 'Farm Tools', icon: '🔧' },
  { slug: 'animal-feed', name: 'Animal Feed', icon: '🐄' },
];

type SeedProduct = {
  name: string;
  category: string;
  brand: string;
  image: string;
  description: string;
  crops: string[];
  safety?: string;
  variants: { pack: string; price: number; mrp: number; stock: number; gst?: number }[];
};

const PRODUCTS: SeedProduct[] = [
  {
    name: 'Hybrid Paddy Seeds (BPT 5204)',
    category: 'seeds',
    brand: 'Krishi Seeds Co.',
    image: 'products/seeds/paddy_seeds.jpg',
    description: 'High-yield, fine-grain paddy variety. 135-140 day duration, blast tolerant. Seed rate 25 kg/acre.',
    crops: ['Paddy'],
    variants: [
      { pack: '10 kg bag', price: 780, mrp: 850, stock: 140, gst: 0 },
      { pack: '25 kg bag', price: 1850, mrp: 2050, stock: 60, gst: 0 },
    ],
  },
  {
    name: 'Hybrid Tomato Seeds (Arka Rakshak)',
    category: 'seeds',
    brand: 'Arka Seeds',
    image: 'products/seeds/tomato_seeds.jpg',
    description: 'Triple disease resistant tomato hybrid. Firm fruits ideal for long-distance transport.',
    crops: ['Tomato', 'Vegetables'],
    variants: [
      { pack: '10 g pouch', price: 420, mrp: 480, stock: 200, gst: 0 },
      { pack: '50 g pouch', price: 1950, mrp: 2200, stock: 45, gst: 0 },
    ],
  },
  {
    name: 'Byadgi Chilli Seeds',
    category: 'seeds',
    brand: 'Krishi Seeds Co.',
    image: 'products/seeds/chilli_seeds.jpg',
    description: 'Deep red, low-pungency Byadgi chilli. Excellent colour value for spice markets.',
    crops: ['Chilli'],
    variants: [{ pack: '100 g pouch', price: 650, mrp: 720, stock: 90, gst: 0 }],
  },
  {
    name: 'NPK 19:19:19 Water Soluble Fertilizer',
    category: 'fertilizers',
    brand: 'Coromandel',
    image: 'products/fertilizers/npk_fertilizer.jpg',
    description: 'Balanced 100% water-soluble NPK for drip and foliar application at all growth stages.',
    crops: ['Cotton', 'Vegetables', 'Chilli', 'Paddy'],
    safety: 'Store in a cool dry place. Keep away from children.',
    variants: [
      { pack: '1 kg pack', price: 165, mrp: 190, stock: 300, gst: 5 },
      { pack: '25 kg bag', price: 3600, mrp: 3950, stock: 40, gst: 5 },
    ],
  },
  {
    name: 'Organic Vermicompost',
    category: 'fertilizers',
    brand: 'Bhoomi Organics',
    image: 'products/fertilizers/organic_fertilizer.jpg',
    description: 'Rich vermicompost to improve soil health, water retention and microbial activity.',
    crops: ['All Crops'],
    variants: [
      { pack: '5 kg bag', price: 120, mrp: 150, stock: 250, gst: 0 },
      { pack: '40 kg bag', price: 799, mrp: 950, stock: 15, gst: 0 },
    ],
  },
  {
    name: 'Neem Bio-Pesticide (1500 ppm)',
    category: 'crop-protection',
    brand: 'Bhoomi Organics',
    image: 'products/crop-protection/bio_pesticide.jpg',
    description: 'Azadirachtin based bio-pesticide for sucking pests, whitefly and early-stage caterpillars.',
    crops: ['Cotton', 'Vegetables', 'Chilli'],
    safety: 'Wear gloves and mask while spraying. Do not spray during strong wind.',
    variants: [
      { pack: '500 ml bottle', price: 340, mrp: 390, stock: 120, gst: 18 },
      { pack: '1 L bottle', price: 620, mrp: 700, stock: 80, gst: 18 },
    ],
  },
  {
    name: 'Mancozeb 75% WP Fungicide',
    category: 'crop-protection',
    brand: 'Dhanuka',
    image: 'products/crop-protection/fungicide_protection.jpg',
    description: 'Broad-spectrum contact fungicide for leaf spot, blight and downy mildew.',
    crops: ['Tomato', 'Potato', 'Grapes', 'Paddy'],
    safety: 'Toxic if swallowed. Use protective clothing. Wash hands after use.',
    variants: [{ pack: '500 g pack', price: 280, mrp: 320, stock: 18, gst: 18 }],
  },
  {
    name: 'Drip Irrigation Kit (1 Acre)',
    category: 'irrigation',
    brand: 'Jain Irrigation',
    image: 'products/irrigation/drip_irrigation_kit.jpg',
    description: 'Complete 1-acre drip kit with laterals, drippers, filter and fittings. Saves up to 60% water.',
    crops: ['Vegetables', 'Sugarcane', 'Banana'],
    variants: [{ pack: '1 acre kit', price: 18500, mrp: 21000, stock: 12, gst: 12 }],
  },
  {
    name: 'Openwell Submersible Pump 1 HP',
    category: 'irrigation',
    brand: 'Kirloskar',
    image: 'products/irrigation/water_pump.jpg',
    description: 'Single-phase 1 HP openwell pump with copper winding. 2 year warranty.',
    crops: ['All Crops'],
    variants: [{ pack: '1 unit', price: 8900, mrp: 10500, stock: 9, gst: 18 }],
  },
  {
    name: 'Battery Knapsack Sprayer 16 L',
    category: 'sprayers',
    brand: 'Neptune',
    image: 'products/sprayers/battery_sprayer.jpg',
    description: '12V 8Ah battery sprayer, 6-8 hours runtime, with 4 nozzle types.',
    crops: ['All Crops'],
    variants: [{ pack: '16 L', price: 2650, mrp: 3200, stock: 35, gst: 18 }],
  },
  {
    name: 'Manual Hand Sprayer 16 L',
    category: 'sprayers',
    brand: 'Aspee',
    image: 'products/sprayers/manual_sprayer.jpg',
    description: 'Rugged manual knapsack sprayer with brass lance and adjustable nozzle.',
    crops: ['All Crops'],
    variants: [{ pack: '16 L', price: 1150, mrp: 1400, stock: 60, gst: 18 }],
  },
  {
    name: 'Farm Hand Tools Set (5 pcs)',
    category: 'tools',
    brand: 'Falcon',
    image: 'products/tools/hand_tools.jpg',
    description: 'Khurpi, weeder, rake, trowel and cultivator with wooden handles.',
    crops: ['All Crops'],
    variants: [{ pack: '5 piece set', price: 799, mrp: 999, stock: 70, gst: 12 }],
  },
  {
    name: 'Pruning Secateur & Saw Kit',
    category: 'tools',
    brand: 'Falcon',
    image: 'products/tools/pruning_tools.jpg',
    description: 'Carbon steel secateur and folding saw for orchards, grapes and pomegranate.',
    crops: ['Grapes', 'Pomegranate', 'Mango'],
    variants: [{ pack: '2 piece kit', price: 690, mrp: 850, stock: 40, gst: 12 }],
  },
  {
    name: 'Cattle Feed Pellets (Milk Booster)',
    category: 'animal-feed',
    brand: 'Nandini',
    image: 'products/animal-feed/cattle_feed.jpg',
    description: 'Balanced pellet feed with bypass protein and minerals for higher milk yield.',
    crops: ['Dairy'],
    variants: [{ pack: '50 kg bag', price: 1450, mrp: 1600, stock: 55, gst: 5 }],
  },
  {
    name: 'Poultry Layer Feed',
    category: 'animal-feed',
    brand: 'Godrej Agrovet',
    image: 'products/animal-feed/poultry_feed.jpg',
    description: 'Complete layer mash for consistent egg production and shell strength.',
    crops: ['Poultry'],
    variants: [{ pack: '25 kg bag', price: 980, mrp: 1100, stock: 8, gst: 5 }],
  },
];

type SeedMachine = {
  name: string;
  type: string;
  images: string[];
  description: string;
  hourly: number;
  daily: number;
  operator: boolean;
  owner: 0 | 1;
  lat: number;
  lng: number;
  rating: number;
  village: string;
};

const MACHINES: SeedMachine[] = [
  { name: 'Mahindra 575 DI Tractor (45 HP)', type: 'Tractor', images: ['machinery/tractors/tractor_front.jpg', 'machinery/tractors/tractor_field.jpg'], description: '45 HP tractor for ploughing, rotavation and haulage. Diesel included for hourly bookings.', hourly: 900, daily: 6500, operator: true, owner: 0, lat: 15.37, lng: 75.12, rating: 4.8, village: 'Unkal' },
  { name: 'Swaraj 744 FE Tractor (48 HP)', type: 'Tractor', images: ['machinery/tractors/tractor_field.jpg'], description: 'Powerful 48 HP tractor suited to heavy implements and black cotton soil.', hourly: 950, daily: 6800, operator: true, owner: 1, lat: 15.43, lng: 75.01, rating: 4.6, village: 'Navalgund Road' },
  { name: 'Kartar 4000 Combine Harvester', type: 'Harvester', images: ['machinery/harvesters/harvester_paddy.jpg'], description: 'Self-propelled combine for paddy and wheat. Covers 8-10 acres per day.', hourly: 2800, daily: 21000, operator: true, owner: 0, lat: 15.35, lng: 75.14, rating: 4.7, village: 'Gokul Road' },
  { name: 'Preet 987 Wheat Harvester', type: 'Harvester', images: ['machinery/harvesters/harvester_wheat.jpg'], description: 'Tractor-mounted harvester ideal for wheat and soybean.', hourly: 2400, daily: 18000, operator: true, owner: 1, lat: 15.46, lng: 75.0, rating: 4.4, village: 'Dharwad' },
  { name: 'Shaktiman Rotavator (6 ft)', type: 'Rotavator', images: ['machinery/rotavators/rotavator_machine.jpg', 'machinery/rotavators/rotavator_field.jpg'], description: '42-blade rotavator for fine seedbed preparation in one pass.', hourly: 450, daily: 3200, operator: false, owner: 0, lat: 15.36, lng: 75.11, rating: 4.5, village: 'Unkal' },
  { name: 'Spring Loaded Cultivator (9 tyne)', type: 'Cultivator', images: ['machinery/cultivators/cultivator_machine.jpg', 'machinery/cultivators/cultivator_field.jpg'], description: 'Breaks hard soil and removes weeds; ideal before sowing.', hourly: 350, daily: 2400, operator: false, owner: 1, lat: 15.44, lng: 75.02, rating: 4.3, village: 'Navalgund Road' },
  { name: 'MB Plough (2 bottom)', type: 'Plough', images: ['machinery/ploughs/mb_plough_machine.jpg', 'machinery/ploughs/disc_plough_field.jpg'], description: 'Deep primary tillage to turn soil and bury crop residue.', hourly: 400, daily: 2800, operator: true, owner: 0, lat: 15.38, lng: 75.13, rating: 4.4, village: 'Unkal' },
  { name: 'Seed Drill (9 row)', type: 'Seed Drill', images: ['machinery/seed-drills/seed_drill_machine.jpg', 'machinery/seed-drills/seed_drill_field.jpg'], description: 'Precise line sowing with fertilizer box. Saves up to 20% seed.', hourly: 500, daily: 3500, operator: true, owner: 1, lat: 15.45, lng: 75.03, rating: 4.6, village: 'Dharwad' },
  { name: 'Boom Sprayer (400 L)', type: 'Sprayer', images: ['machinery/sprayers/boom_sprayer_machine.jpg', 'machinery/sprayers/orchard_sprayer_machine.jpg'], description: 'Tractor-mounted 12 m boom sprayer, covers 20 acres a day.', hourly: 600, daily: 4200, operator: true, owner: 0, lat: 15.34, lng: 75.15, rating: 4.5, village: 'Gokul Road' },
  { name: 'Multi-crop Thresher', type: 'Thresher', images: ['machinery/threshers/thresher_machine.jpg', 'machinery/threshers/thresher_field.jpg'], description: 'Threshes wheat, soybean, gram and maize. 1 tonne/hour.', hourly: 700, daily: 5000, operator: true, owner: 1, lat: 15.47, lng: 75.01, rating: 4.2, village: 'Dharwad' },
  { name: 'VST Power Tiller (13 HP)', type: 'Power Tiller', images: ['machinery/power-tillers/power_tiller_machine.jpg', 'machinery/power-tillers/power_tiller_wetland.jpg'], description: 'Compact tiller for wetland puddling and small plots.', hourly: 380, daily: 2600, operator: true, owner: 0, lat: 15.39, lng: 75.1, rating: 4.4, village: 'Unkal' },
  { name: 'Tractor Trailer (5 tonne)', type: 'Trailer', images: ['machinery/trailers/tractor_trailer_trolley.jpg', 'machinery/trailers/trailer_field_loaded.jpg'], description: 'Hydraulic tipping trailer for produce and input haulage.', hourly: 300, daily: 2000, operator: false, owner: 1, lat: 15.42, lng: 75.04, rating: 4.3, village: 'Navalgund Road' },
];

async function wipe() {
  // Child tables first
  await prisma.$transaction([
    prisma.locationPing.deleteMany(),
    prisma.deliveryJob.deleteMany(),
    prisma.refund.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.orderStatusLog.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.rentalStatusLog.deleteMany(),
    prisma.rental.deleteMany(),
    prisma.machineAvailability.deleteMany(),
    prisma.machineImage.deleteMany(),
    prisma.machine.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.review.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.category.deleteMany(),
    prisma.ticketMessage.deleteMany(),
    prisma.supportTicket.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.vehicle.deleteMany(),
    prisma.driver.deleteMany(),
    prisma.ownerProfile.deleteMany(),
    prisma.address.deleteMany(),
    prisma.session.deleteMany(),
    prisma.deviceToken.deleteMany(),
    prisma.otpAttempt.deleteMany(),
    prisma.user.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.banner.deleteMany(),
    prisma.fAQ.deleteMany(),
    prisma.serviceArea.deleteMany(),
  ]);
}

async function main() {
  const reset = process.argv.includes('--reset');
  if (!reset && (await prisma.product.count()) > 0) {
    console.log('Demo data already present, skipping seed (use --reset to reseed).');
    return;
  }
  if (reset) {
    console.log('Wiping existing data...');
    await wipe();
  }

  console.log('Seeding users...');
  const farmer = await prisma.user.create({
    data: {
      phone: '9876543210',
      name: 'Ramesh Patil',
      role: 'FARMER',
      village: 'Unkal',
      district: 'Dharwad',
      state: 'Karnataka',
      pincode: '580031',
      preferredLang: 'en',
      landSizeAcres: 5,
      mainCrops: 'Cotton,Paddy,Chilli',
      farmLat: 15.3712,
      farmLng: 75.1198,
      addresses: {
        create: {
          label: 'Main Farm',
          village: 'Unkal',
          district: 'Dharwad',
          state: 'Karnataka',
          pincode: '580031',
          latitude: 15.3712,
          longitude: 75.1198,
          isDefault: true,
        },
      },
    },
    include: { addresses: true },
  });
  const farmer2 = await prisma.user.create({
    data: {
      phone: '9876500001',
      name: 'Lakshmi Hegde',
      role: 'FARMER',
      village: 'Navalgund',
      district: 'Dharwad',
      state: 'Karnataka',
      pincode: '582208',
      landSizeAcres: 3,
      mainCrops: 'Tomato,Chilli',
      addresses: {
        create: {
          label: 'Home',
          village: 'Navalgund',
          district: 'Dharwad',
          state: 'Karnataka',
          pincode: '582208',
          latitude: 15.5571,
          longitude: 75.3537,
          isDefault: true,
        },
      },
    },
    include: { addresses: true },
  });

  const ownerSpecs = [
    { phone: '9845000001', name: 'Basavaraj Patil', village: 'Unkal', business: 'Patil Agro Rentals', kyc: 'APPROVED' },
    { phone: '9845000002', name: 'Mallikarjun Gowda', village: 'Dharwad', business: 'Gowda Farm Machinery', kyc: 'APPROVED' },
    { phone: '9845000009', name: 'Shivanand Kulkarni', village: 'Hubballi', business: 'Kulkarni Tractors', kyc: 'PENDING_APPROVAL' },
  ];
  const owners = [];
  for (const [i, o] of ownerSpecs.entries()) {
    owners.push(
      await prisma.user.create({
        data: {
          phone: o.phone,
          name: o.name,
          role: 'OWNER',
          village: o.village,
          district: 'Dharwad',
          state: 'Karnataka',
          pincode: '580031',
          ownerProfile: {
            create: {
              businessName: o.business,
              aadhaarNumber: `12341234${5670 + i}`,
              panNumber: `ABCPK${1230 + i}F`,
              bankAccountNumber: `5010023456${780 + i}`,
              bankIfsc: 'SBIN0001234',
              bankAccountName: o.name,
              kycStatus: o.kyc,
              approvedAt: o.kyc === 'APPROVED' ? new Date() : null,
            },
          },
        },
      })
    );
  }

  const driverSpecs = [
    { phone: '9900000001', name: 'Suresh Naik', vehicle: 'KA25AB1234', type: 'MINI_TRUCK', kyc: 'APPROVED' },
    { phone: '9900000002', name: 'Ravi Kumar', vehicle: 'KA25CD5678', type: 'TRACTOR_TRAILER', kyc: 'APPROVED' },
    { phone: '9900000009', name: 'Imran Shaikh', vehicle: 'KA25EF9012', type: 'MINI_TRUCK', kyc: 'PENDING_APPROVAL' },
  ];
  const drivers = [];
  for (const [i, d] of driverSpecs.entries()) {
    const u = await prisma.user.create({
      data: { phone: d.phone, name: d.name, role: 'DRIVER', village: 'Hubballi', district: 'Dharwad', state: 'Karnataka' },
    });
    drivers.push(
      await prisma.driver.create({
        data: {
          userId: u.id,
          name: d.name,
          phone: d.phone,
          licenceNumber: `KA25 2019000${100 + i}`,
          aadhaarNumber: `98769876${4320 + i}`,
          kycStatus: d.kyc,
          approvedAt: d.kyc === 'APPROVED' ? new Date() : null,
          vehicle: { create: { vehicleNumber: d.vehicle, vehicleType: d.type, model: 'Tata Ace' } },
        },
      })
    );
  }

  await prisma.user.create({
    data: {
      phone: '9999999999',
      name: 'Kisan Kendra Admin',
      role: 'ADMIN',
      adminSubRole: 'SUPER_ADMIN',
      email: 'admin@kisankendra.in',
      passwordHash: await bcrypt.hash('Admin@123', 10),
    },
  });

  for (const u of [farmer, farmer2, ...owners]) {
    await prisma.cart.create({ data: { userId: u.id } });
  }

  console.log('Seeding catalog...');
  const categoryIds = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const cat = await prisma.category.create({
      data: { name: c.name, slug: c.slug, iconUrl: c.icon, displayOrder: i },
    });
    categoryIds.set(c.slug, cat.id);
  }

  const brandIds = new Map<string, string>();
  const variantsBySku = new Map<string, { id: string; price: number; gst: number; name: string; pack: string }>();
  for (const p of PRODUCTS) {
    if (!brandIds.has(p.brand)) {
      brandIds.set(p.brand, (await prisma.brand.create({ data: { name: p.brand } })).id);
    }
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug,
        description: p.description,
        categoryId: categoryIds.get(p.category)!,
        brandId: brandIds.get(p.brand),
        suitableCrops: p.crops,
        safetyInfo: p.safety,
        images: { create: [{ url: img(p.image) }] },
      },
    });
    for (const [vi, v] of p.variants.entries()) {
      const sku = `${slug}-${vi + 1}`;
      const variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          packSize: v.pack,
          sku,
          pricePaise: paise(v.price),
          mrpPaise: paise(v.mrp),
          gstRate: v.gst ?? 18,
          stock: v.stock,
          stockMovements: {
            create: { quantity: v.stock, type: 'INWARD', reason: 'Opening stock', balanceAfter: v.stock },
          },
        },
      });
      variantsBySku.set(sku, { id: variant.id, price: v.price, gst: v.gst ?? 18, name: p.name, pack: v.pack });
    }
  }

  console.log('Seeding machinery...');
  const machines = [];
  for (const m of MACHINES) {
    machines.push(
      await prisma.machine.create({
        data: {
          name: m.name,
          type: m.type,
          description: m.description,
          ownerId: owners[m.owner].id,
          village: m.village,
          district: 'Dharwad',
          hourlyRatePaise: paise(m.hourly),
          dailyRatePaise: paise(m.daily),
          operatorAvailable: m.operator,
          latitude: m.lat,
          longitude: m.lng,
          rating: m.rating,
          images: { create: m.images.map((url, i) => ({ url: img(url), displayOrder: i })) },
        },
      })
    );
  }

  console.log('Seeding coupons, banners, FAQs, service areas...');
  await prisma.coupon.createMany({
    data: [
      { code: 'KISANFIRST', discountPercent: 10, maxDiscountPaise: paise(200), minOrderPaise: paise(300) },
      { code: 'RABI2026', discountPercent: 15, maxDiscountPaise: paise(500), minOrderPaise: paise(1500) },
      { code: 'DRIP500', discountPercent: 5, maxDiscountPaise: paise(1000), minOrderPaise: paise(10000) },
    ],
  });
  await prisma.banner.createMany({
    data: [
      { title: 'Rabi sowing season: up to 15% off seeds', imageUrl: img('products/seeds/paddy_seeds.jpg'), targetScreen: 'Shop', deepLink: 'seeds', displayOrder: 0 },
      { title: 'Book a tractor in 2 minutes', imageUrl: img('machinery/tractors/tractor_field.jpg'), targetScreen: 'Rent', deepLink: 'Tractor', displayOrder: 1 },
      { title: 'Harvest faster with combine harvesters', imageUrl: img('machinery/harvesters/harvester_paddy.jpg'), targetScreen: 'Rent', deepLink: 'Harvester', displayOrder: 2 },
      { title: 'Save 60% water with drip kits', imageUrl: img('products/irrigation/drip_irrigation_kit.jpg'), targetScreen: 'Shop', deepLink: 'irrigation', displayOrder: 3 },
    ],
  });
  await prisma.fAQ.createMany({
    data: [
      { question: 'How do I pay for my order?', answer: 'Pay by UPI at checkout or choose Cash on Delivery and pay the driver at your farm gate.', category: 'ORDERS', displayOrder: 0 },
      { question: 'When will my order be delivered?', answer: 'Most orders in Dharwad district are delivered within 24-48 hours. You can track the driver live in the Orders tab.', category: 'ORDERS', displayOrder: 1 },
      { question: 'What is the handover OTP?', answer: 'A 4-digit code sent to you in Notifications. Share it with the driver only when you receive your items or machine.', category: 'ORDERS', displayOrder: 2 },
      { question: 'Can I cancel a machine booking?', answer: 'Yes, free cancellation until the machine is dispatched from the owner.', category: 'RENTALS', displayOrder: 3 },
      { question: 'Is an operator included?', answer: 'Choose "With operator" while booking. Operator charge is ₹150 per hour.', category: 'RENTALS', displayOrder: 4 },
    ],
  });
  await prisma.serviceArea.createMany({
    data: [
      { name: 'Hubballi Rural (Unkal)', pincode: '580031' },
      { name: 'Hubballi City', pincode: '580020' },
      { name: 'Navanagar', pincode: '580025' },
      { name: 'Dharwad', pincode: '580001' },
      { name: 'Navalgund', pincode: '582208', deliveryFeePaise: 7900 },
      { name: 'Belagavi', pincode: '590001', deliveryFeePaise: 9900, minOrderFreeDeliveryPaise: 149900 },
    ],
  });

  console.log('Seeding sample orders & rentals...');
  const day = 24 * 3600 * 1000;
  const address = farmer.addresses[0];
  const orderSpecs = [
    { humanId: 'ORD-DEMO-0001', status: 'DELIVERED' as const, ago: 6, items: [['hybrid-paddy-seeds-bpt-5204-1', 2], ['npk-19-19-19-water-soluble-fertilizer-1', 4]] },
    { humanId: 'ORD-DEMO-0002', status: 'CONFIRMED' as const, ago: 1, items: [['battery-knapsack-sprayer-16-l-1', 1], ['neem-bio-pesticide-1500-ppm-2', 1]] },
    { humanId: 'ORD-DEMO-0003', status: 'PLACED' as const, ago: 0, items: [['hybrid-tomato-seeds-arka-rakshak-1', 3], ['organic-vermicompost-1', 4]] },
  ];
  const flow = ['PLACED', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;
  for (const spec of orderSpecs) {
    const lines = spec.items.map(([sku, qty]) => ({ v: variantsBySku.get(sku as string)!, qty: qty as number }));
    const subtotal = lines.reduce((s, l) => s + paise(l.v.price) * l.qty, 0);
    const gst = lines.reduce((s, l) => {
      const t = paise(l.v.price) * l.qty;
      return s + Math.round(t - t / (1 + l.v.gst / 100));
    }, 0);
    const deliveryFee = subtotal >= 99900 ? 0 : 4900;
    const createdAt = new Date(Date.now() - spec.ago * day - 3 * 3600 * 1000);
    const steps = flow.slice(0, flow.indexOf(spec.status as any) + 1);
    await prisma.order.create({
      data: {
        humanId: spec.humanId,
        userId: farmer.id,
        addressId: address.id,
        status: spec.status,
        totalPaise: subtotal + deliveryFee,
        gstPaise: gst,
        deliveryFeePaise: deliveryFee,
        paymentMethod: spec.status === 'DELIVERED' ? 'RAZORPAY' : 'COD',
        paymentStatus: spec.status === 'DELIVERED' ? 'PAID' : 'PENDING',
        createdAt,
        items: {
          create: lines.map((l) => ({
            variantId: l.v.id,
            productName: l.v.name,
            packSize: l.v.pack,
            quantity: l.qty,
            unitPricePaise: paise(l.v.price),
            gstRate: l.v.gst,
            totalPaise: paise(l.v.price) * l.qty,
          })),
        },
        statusLogs: {
          create: steps.map((to, i) => ({
            fromStatus: i === 0 ? 'PLACED' : steps[i - 1],
            toStatus: to,
            reason: i === 0 ? 'Order placed by farmer' : `Moved to ${to}`,
            createdAt: new Date(createdAt.getTime() + i * 5 * 3600 * 1000),
          })),
        },
        deliveryJob: {
          create: {
            type: 'ORDER_DELIVERY',
            status: spec.status === 'DELIVERED' ? 'DELIVERED' : 'ASSIGNED',
            driverId: spec.status === 'DELIVERED' ? drivers[0].id : null,
            pickupLat: 15.3647,
            pickupLng: 75.124,
            dropoffLat: address.latitude,
            dropoffLng: address.longitude,
          },
        },
      },
    });
  }

  // One completed rental, one awaiting owner acceptance
  const rentalSpecs = [
    { humanId: 'RENT-DEMO-0001', machine: machines[0], status: 'COMPLETED' as const, hours: 4, startOffset: -4 * day },
    { humanId: 'RENT-DEMO-0002', machine: machines[4], status: 'CONFIRMED' as const, hours: 8, startOffset: 2 * day },
  ];
  for (const r of rentalSpecs) {
    const hours = r.hours;
    const base = hours >= 8 ? Math.floor(hours / 8) * r.machine.dailyRatePaise : hours * r.machine.hourlyRatePaise;
    const subtotal = base + hours * 15000 + 99900;
    const total = subtotal + Math.round(subtotal * 0.18) + Math.round(base * 0.2);
    const rentalSteps =
      r.status === 'COMPLETED'
        ? (['CONFIRMED', 'MACHINE_ASSIGNED', 'DISPATCHED', 'NEAR_FARM', 'ARRIVED', 'STARTED', 'COMPLETED'] as const)
        : (['CONFIRMED'] as const);
    await prisma.rental.create({
      data: {
        humanId: r.humanId,
        machineId: r.machine.id,
        userId: farmer.id,
        addressId: address.id,
        status: r.status,
        startDate: new Date(Date.now() + r.startOffset),
        durationHours: hours,
        totalPaise: total,
        depositPaise: Math.round(base * 0.2),
        paymentStatus: r.status === 'COMPLETED' ? 'PAID' : 'PENDING',
        statusLogs: {
          create: rentalSteps.map((to, i) => ({
            fromStatus: i === 0 ? 'CONFIRMED' : rentalSteps[i - 1],
            toStatus: to,
            reason: i === 0 ? 'Rental booking confirmed by farmer' : `Moved to ${to}`,
          })),
        },
        deliveryJob: {
          create: {
            type: 'RENTAL',
            status: r.status === 'COMPLETED' ? 'DELIVERED' : 'ASSIGNED',
            driverId: r.status === 'COMPLETED' ? drivers[1].id : null,
            pickupLat: r.machine.latitude,
            pickupLng: r.machine.longitude,
            dropoffLat: address.latitude,
            dropoffLng: address.longitude,
            otpHash: await bcrypt.hash('1234', 10),
          },
        },
      },
    });
  }

  // Reviews from the second farmer
  const reviewTargets = await prisma.product.findMany({ take: 5, orderBy: { name: 'asc' } });
  for (const [i, p] of reviewTargets.entries()) {
    await prisma.review.create({
      data: {
        productId: p.id,
        userId: farmer2.id,
        rating: 4 + (i % 2),
        comment: ['Good germination, will buy again.', 'Delivered on time, genuine product.', 'Works well, value for money.'][i % 3],
        isVerifiedPurchase: true,
      },
    });
  }

  await prisma.notification.createMany({
    data: [
      { userId: farmer.id, title: 'Welcome to Kisan Kendra', body: 'Use code KISANFIRST for 10% off your first order.' },
      { userId: farmer.id, title: 'Order ORD-DEMO-0001', body: 'Your order has been delivered. Thank you!' },
      { userId: owners[0].id, title: 'New booking request', body: `${machines[4].name} requested for 8 hours` },
    ],
  });

  console.log('\nDemo data ready.');
  console.log('  Farmer : 9876543210  (OTP 123456)');
  console.log('  Owner  : 9845000001  (OTP 123456)');
  console.log('  Driver : 9900000001  (OTP 123456)');
  console.log('  Admin  : admin@kisankendra.in / Admin@123');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
