import { z } from 'zod';

// ==========================================
// User Roles & Auth Enums
// ==========================================
export const UserRole = {
  FARMER: 'FARMER',
  DRIVER: 'DRIVER',
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserRoleEnum = z.enum(['FARMER', 'DRIVER', 'OWNER', 'ADMIN']);

export const AdminSubRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CATALOG: 'CATALOG',
  OPERATIONS: 'OPERATIONS',
  SUPPORT: 'SUPPORT',
  FINANCE: 'FINANCE',
} as const;
export type AdminSubRole = (typeof AdminSubRole)[keyof typeof AdminSubRole];

export const OrderStatus = {
  PLACED: 'PLACED',
  CONFIRMED: 'CONFIRMED',
  PACKED: 'PACKED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const RentalStatus = {
  CONFIRMED: 'CONFIRMED',
  MACHINE_ASSIGNED: 'MACHINE_ASSIGNED',
  OPERATOR_ASSIGNED: 'OPERATOR_ASSIGNED',
  DISPATCHED: 'DISPATCHED',
  NEAR_FARM: 'NEAR_FARM',
  ARRIVED: 'ARRIVED',
  STARTED: 'STARTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type RentalStatus = (typeof RentalStatus)[keyof typeof RentalStatus];

export const PaymentMethod = {
  RAZORPAY: 'RAZORPAY',
  COD: 'COD',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const JobType = {
  ORDER_DELIVERY: 'ORDER_DELIVERY',
  RENTAL: 'RENTAL',
} as const;
export type JobType = (typeof JobType)[keyof typeof JobType];

export const DeliveryJobStatus = {
  ASSIGNED: 'ASSIGNED',
  ACCEPTED: 'ACCEPTED',
  STARTED: 'STARTED',
  ARRIVED: 'ARRIVED',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
} as const;
export type DeliveryJobStatus = (typeof DeliveryJobStatus)[keyof typeof DeliveryJobStatus];

export const StockMovementType = {
  INWARD: 'INWARD',
  OUTWARD_ORDER: 'OUTWARD_ORDER',
  ADJUSTMENT_DAMAGE: 'ADJUSTMENT_DAMAGE',
  ADJUSTMENT_AUDIT: 'ADJUSTMENT_AUDIT',
  RETURN: 'RETURN',
} as const;
export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType];

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  SLOT_UNAVAILABLE: 'SLOT_UNAVAILABLE',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ==========================================
// Auth Payload
// ==========================================
export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
  phone: string;
  adminSubRole?: AdminSubRole | null;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

// ==========================================
// Zod Validation Schemas
// ==========================================
export const PhoneSchema = z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number');

export const OtpRequestSchema = z.object({
  phone: PhoneSchema,
});

export const OtpVerifySchema = z.object({
  phone: PhoneSchema,
  otp: z.string().length(6, 'OTP must be 6 digits'),
  role: z.nativeEnum(UserRole).optional(),
  deviceId: z.string().optional(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
});

export const FarmerProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  village: z.string().optional(),
  taluk: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().length(6, 'Pincode must be 6 digits').optional(),
  preferredLanguage: z.string().optional(),
  cropsGrown: z.array(z.string()).optional(),
  mainCrops: z.union([z.string(), z.array(z.string())]).optional(),
  landSizeAcres: z.number().optional(),
  farmLatitude: z.number().optional(),
  farmLongitude: z.number().optional(),
});

export const OwnerSignupSchema = z.object({
  phone: PhoneSchema,
  name: z.string().min(2, 'Name is required'),
  businessName: z.string().optional(),
  address: z.string().optional(),
  district: z.string().optional(),
  pincode: z.string().optional(),
  aadhaarNumber: z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 numeric digits'),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format'),
  bankAccountNumber: z.string().min(9).max(18, 'Bank account number must be 9-18 digits'),
  bankIfsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format'),
  bankAccountName: z.string().min(2, 'Bank account holder name is required'),
  photoUrl: z.string().optional(),
});

export const DriverInviteSchema = z.object({
  name: z.string().min(2, 'Driver name required'),
  phone: z.string().min(10, 'Valid 10-digit phone required'),
  licenceNumber: z.string().min(4, 'Driving license number required'),
  aadhaarNumber: z.string().optional(),
  vehicleNumber: z.string().optional(),
  vehicleType: z.string().optional(),
  experienceYears: z.number().optional(),
  emergencyContact: z.string().optional(),
});

export const SelectProfileSchema = z.object({
  tempToken: z.string().min(1, 'Temporary token required'),
  selectedRole: z.nativeEnum(UserRole),
  deviceId: z.string().optional(),
});

export const AdminLoginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  totpToken: z.string().length(6, 'TOTP code must be 6 digits').optional(),
});

export const KycReviewSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().optional(),
});

export const JobOtpVerifySchema = z.object({
  jobId: z.string(),
  otp: z.string().length(4, 'Handover OTP must be 4 digits'),
});

export const BatchLocationPingSchema = z.object({
  pings: z.array(
    z.object({
      jobId: z.string(),
      driverId: z.string().optional(),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      speed: z.number().optional(),
      heading: z.number().optional(),
      accuracy: z.number().optional(),
      timestamp: z.string(),
    })
  ),
});
