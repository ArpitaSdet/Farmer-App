const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * MongoDB / Mongoose Schemas for Farmer App
 */

// 1. User & Farmer Profile
const UserSchema = new Schema(
  {
    mobileNumber: { type: String, required: true, unique: true, index: true },
    role: { type: String, enum: ['FARMER', 'ADMIN', 'MACHINE_OWNER', 'DELIVERY_OPERATOR'], default: 'FARMER' },
    name: { type: String, default: '' },
    village: { type: String, default: '' },
    taluk: { type: String, default: '' },
    district: { type: String, default: '' },
    state: { type: String, default: 'Karnataka' },
    pincode: { type: String, default: '' },
    farmSize: { type: String, default: '' },
    mainCrops: [{ type: String }],
    preferredLanguage: { type: String, enum: ['en', 'kn', 'hi', 'mr', 'te', 'ta'], default: 'en' },
    isBlocked: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: true },
    pushToken: { type: String },
  },
  { timestamps: true }
);

// 2. Category
const CategorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    name_kn: String,
    name_hi: String,
    name_mr: String,
    name_te: String,
    name_ta: String,
    icon: String,
    image: String,
    itemCount: { type: Number, default: 0 },
    popular: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// 3. Product
const ProductSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    categorySlug: { type: String, required: true, index: true },
    brand: { type: String, index: true },
    packSize: String,
    price: { type: Number, required: true, index: true },
    mrp: Number,
    discountPercentage: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    inStock: { type: Boolean, default: true },
    rating: { type: Number, default: 4.8 },
    reviewCount: { type: Number, default: 0 },
    image: String,
    description: String,
    suitableCrops: [{ type: String }],
    dosage: String,
    usageInstructions: String,
    deliveryTime: String,
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// 4. Farm Machinery
const MachineSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true }, // Tractor, Harvester, etc.
    brand: String,
    model: String,
    horsepower: String,
    specs: Schema.Types.Mixed,
    ownerName: String,
    ownerPhone: String,
    location: String,
    district: { type: String, index: true },
    state: String,
    pincode: String,
    distanceKm: { type: Number, default: 5 },
    hourlyRate: { type: Number, required: true },
    dailyRate: { type: Number, required: true },
    securityDeposit: { type: Number, default: 1000 },
    operatorAvailable: { type: Boolean, default: true },
    operatorRatePerHour: { type: Number, default: 150 },
    deliveryAvailable: { type: Boolean, default: true },
    deliveryRatePerKm: { type: Number, default: 25 },
    rating: { type: Number, default: 4.8 },
    reviewCount: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
    image: String,
    description: String,
    compatibleAttachments: [{ type: String }],
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// 5. Rental Booking
const RentalBookingSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    farmerName: String,
    farmerPhone: String,
    machineId: { type: Schema.Types.ObjectId, ref: 'Machine' },
    machineName: String,
    machineType: String,
    machineImage: String,
    ownerName: String,
    ownerPhone: String,
    startDate: { type: String, required: true },
    startTime: { type: String, required: true },
    durationHours: { type: Number, default: 4 },
    durationDays: { type: Number, default: 0 },
    withOperator: { type: Boolean, default: true },
    withDelivery: { type: Boolean, default: true },
    deliveryAddress: String,
    pricing: {
      baseRental: Number,
      operatorFee: Number,
      deliveryFee: Number,
      securityDeposit: Number,
      totalAmount: Number,
    },
    paymentMethod: { type: String, default: 'CASH_AFTER_WORK' },
    paymentStatus: { type: String, default: 'PENDING' },
    status: {
      type: String,
      enum: ['BOOKED', 'CONFIRMED', 'DISPATCHED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'CONFIRMED',
    },
    trackingStages: [
      {
        stage: String,
        done: Boolean,
        time: String,
      },
    ],
  },
  { timestamps: true }
);

// 6. Product Order
const OrderSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    farmerName: String,
    farmerPhone: String,
    items: [
      {
        productId: String,
        name: String,
        price: Number,
        quantity: Number,
        image: String,
        brand: String,
        packSize: String,
      },
    ],
    itemsTotal: Number,
    deliveryFee: Number,
    totalAmount: Number,
    deliveryAddress: {
      farmerName: String,
      village: String,
      district: String,
      state: String,
      pincode: String,
      phone: String,
    },
    paymentMethod: { type: String, default: 'UPI' },
    paymentStatus: { type: String, default: 'PENDING' },
    status: {
      type: String,
      enum: ['PLACED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
      default: 'PLACED',
    },
    trackingSteps: [
      {
        title: String,
        time: String,
        completed: Boolean,
      },
    ],
  },
  { timestamps: true }
);

// 7. Dynamic Promotional Banners & Posters
const BannerSchema = new Schema(
  {
    title: { type: String, required: true },
    subtitle: String,
    badge: String,
    ctaText: { type: String, required: true },
    targetScreen: { type: String, default: 'Shop' },
    targetCategory: String,
    theme: { type: String, default: 'crops' },
    bgColor: String,
    textColor: String,
    accentColor: String,
    image: String,
    startDate: String,
    endDate: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PosterSchema = new Schema(
  {
    title: { type: String, required: true },
    subtitle: String,
    ctaText: { type: String, required: true },
    targetScreen: { type: String, default: 'Rent' },
    targetCategory: String,
    image: String,
    bgGradient: [String],
    startDate: String,
    endDate: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = {
  User: mongoose.model('User', UserSchema),
  Category: mongoose.model('Category', CategorySchema),
  Product: mongoose.model('Product', ProductSchema),
  Machine: mongoose.model('Machine', MachineSchema),
  RentalBooking: mongoose.model('RentalBooking', RentalBookingSchema),
  Order: mongoose.model('Order', OrderSchema),
  Banner: mongoose.model('Banner', BannerSchema),
  Poster: mongoose.model('Poster', PosterSchema),
};
