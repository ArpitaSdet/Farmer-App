import jwt from 'jsonwebtoken';
import {
  PhoneSchema,
  OtpRequestSchema,
  OtpVerifySchema,
  FarmerProfileSchema,
  UserRole,
  AdminSubRole,
  ErrorCode,
} from '@krishi/shared';
import { requireRole, requireAdminSubRole, authenticate } from '../src/middleware/auth';
import { AppError } from '../src/middleware/errorHandler';

describe('KRISHI Phase 1: Authentication & RBAC Core Tests', () => {
  describe('Zod Validation & Schemas', () => {
    it('should validate valid Indian mobile numbers', () => {
      expect(PhoneSchema.safeParse('9876543210').success).toBe(true);
      expect(PhoneSchema.safeParse('7777777777').success).toBe(true);
      expect(PhoneSchema.safeParse('6123456789').success).toBe(true);
    });

    it('should reject invalid mobile numbers', () => {
      expect(PhoneSchema.safeParse('1234567890').success).toBe(false); // Does not start with 6-9
      expect(PhoneSchema.safeParse('98765').success).toBe(false); // Too short
      expect(PhoneSchema.safeParse('987654321012').success).toBe(false); // Too long
      expect(PhoneSchema.safeParse('abcde12345').success).toBe(false); // Non-numeric
    });

    it('should validate 6-digit OTP verification payload', () => {
      const valid = OtpVerifySchema.safeParse({
        phone: '9876543210',
        otp: '123456',
      });
      expect(valid.success).toBe(true);

      const invalidOtp = OtpVerifySchema.safeParse({
        phone: '9876543210',
        otp: '1234', // Only 4 digits
      });
      expect(invalidOtp.success).toBe(false);
    });

    it('should validate farmer profile completion data', () => {
      const valid = FarmerProfileSchema.safeParse({
        name: 'Ramesh Patel',
        village: 'Mandya',
        district: 'Mandya',
        state: 'Karnataka',
        pincode: '571401',
        preferredLanguage: 'kn',
      });
      expect(valid.success).toBe(true);

      const invalidPincode = FarmerProfileSchema.safeParse({
        name: 'Ramesh',
        village: 'Mandya',
        district: 'Mandya',
        state: 'Karnataka',
        pincode: '571', // Invalid pincode
        preferredLanguage: 'kn',
      });
      expect(invalidPincode.success).toBe(false);
    });
  });

  describe('RBAC Middleware', () => {
    it('should allow access when user role matches allowed roles', () => {
      const req: any = { user: { role: 'FARMER' } };
      const res: any = {};
      const next = jest.fn();

      const middleware = requireRole('FARMER', 'ADMIN');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject with FORBIDDEN when user role does not match', () => {
      const req: any = { user: { role: 'FARMER' } };
      const res: any = {};
      const next = jest.fn();

      const middleware = requireRole('ADMIN');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error: AppError = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ErrorCode.FORBIDDEN);
    });

    it('should reject unauthenticated request without token with 401', () => {
      const req: any = { headers: {} };
      const res: any = {};
      const next = jest.fn();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error: AppError = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('should reject wrong-role access for Driver route with 403', () => {
      const req: any = { user: { role: 'FARMER' } };
      const res: any = {};
      const next = jest.fn();

      const middleware = requireRole('DRIVER');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error: AppError = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ErrorCode.FORBIDDEN);
    });

    it('should reject wrong-role access for Owner route with 403', () => {
      const req: any = { user: { role: 'DRIVER' } };
      const res: any = {};
      const next = jest.fn();

      const middleware = requireRole('OWNER');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error: AppError = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ErrorCode.FORBIDDEN);
    });

    it('should allow SUPER_ADMIN access to any admin sub-role protected route', () => {
      const req: any = { user: { role: 'ADMIN', adminSubRole: 'SUPER_ADMIN' } };
      const res: any = {};
      const next = jest.fn();

      const middleware = requireAdminSubRole('FINANCE');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject admin without matching sub-role', () => {
      const req: any = { user: { role: 'ADMIN', adminSubRole: 'CATALOG' } };
      const res: any = {};
      const next = jest.fn();

      const middleware = requireAdminSubRole('FINANCE');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error: AppError = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });
  });

  describe('JWT Token Generation & Verification', () => {
    const secret = 'test_secret_key_minimum_32_characters_long';

    it('should sign and verify valid JWT payload', () => {
      const payload = {
        userId: 'usr_12345',
        phone: '9876543210',
        role: 'FARMER' as UserRole,
      };

      const token = jwt.sign(payload, secret, { expiresIn: '15m' });
      const decoded = jwt.verify(token, secret) as any;

      expect(decoded.userId).toBe('usr_12345');
      expect(decoded.phone).toBe('9876543210');
      expect(decoded.role).toBe('FARMER');
    });

    it('should fail verification when signature is invalid', () => {
      const payload = { userId: 'usr_12345' };
      const token = jwt.sign(payload, secret);

      expect(() => {
        jwt.verify(token, 'wrong_secret_key');
      }).toThrow();
    });
  });
});
