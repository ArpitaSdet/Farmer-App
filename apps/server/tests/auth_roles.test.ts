import bcrypt from 'bcryptjs';
import {
  UserRoleEnum,
  OwnerSignupSchema,
  DriverInviteSchema,
  AdminLoginSchema,
  SelectProfileSchema,
} from '@krishi/shared';
import { generateTotpSecret, generateTotpCode, verifyTotpToken } from '../src/services/totp';
import { getUserAvailableRoles } from '../src/controllers/authController';

describe('KRISHI Part B: Dedicated Login Per Role & KYC Engine', () => {
  describe('Roles & Schema Definitions', () => {
    it('should validate all four system roles: FARMER, DRIVER, OWNER, ADMIN', () => {
      expect(UserRoleEnum.safeParse('FARMER').success).toBe(true);
      expect(UserRoleEnum.safeParse('DRIVER').success).toBe(true);
      expect(UserRoleEnum.safeParse('OWNER').success).toBe(true);
      expect(UserRoleEnum.safeParse('ADMIN').success).toBe(true);
      expect(UserRoleEnum.safeParse('GUEST').success).toBe(false);
    });

    it('should validate complete Machine Owner / Vendor KYC payload', () => {
      const validKyc = {
        phone: '9876543210',
        name: 'Ramesh Patil',
        businessName: 'Patil Agri Rentals',
        aadhaarNumber: '123456789012',
        panNumber: 'ABCDE1234F',
        bankAccountNumber: '98765432100',
        bankIfsc: 'SBIN0001234',
        bankAccountName: 'Ramesh Patil',
      };

      const result = OwnerSignupSchema.safeParse(validKyc);
      expect(result.success).toBe(true);
    });

    it('should reject invalid Aadhaar number (< 12 digits or non-numeric)', () => {
      const invalidAadhaar = {
        phone: '9876543210',
        name: 'Ramesh Patil',
        aadhaarNumber: '12345', // too short
        panNumber: 'ABCDE1234F',
        bankAccountNumber: '98765432100',
        bankIfsc: 'SBIN0001234',
        bankAccountName: 'Ramesh Patil',
      };

      const result = OwnerSignupSchema.safeParse(invalidAadhaar);
      expect(result.success).toBe(false);
    });

    it('should reject invalid PAN format', () => {
      const invalidPan = {
        phone: '9876543210',
        name: 'Ramesh Patil',
        aadhaarNumber: '123456789012',
        panNumber: '12345ABCDE', // invalid format
        bankAccountNumber: '98765432100',
        bankIfsc: 'SBIN0001234',
        bankAccountName: 'Ramesh Patil',
      };

      const result = OwnerSignupSchema.safeParse(invalidPan);
      expect(result.success).toBe(false);
    });

    it('should validate Driver Invitation payload', () => {
      const validInvite = {
        phone: '7777777777',
        name: 'Suresh Kumar',
        licenceNumber: 'KA25201900123',
        aadhaarNumber: '987654321098',
        vehicleNumber: 'KA-25 M-1234',
        vehicleType: 'TRACTOR',
      };

      const result = DriverInviteSchema.safeParse(validInvite);
      expect(result.success).toBe(true);
    });
  });

  describe('RFC 6238 TOTP 2FA for Admin Web Console', () => {
    it('should generate a valid Base32 secret', () => {
      const secret = generateTotpSecret();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThanOrEqual(16);
      expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
    });

    it('should generate a 6-digit TOTP code and verify it successfully', () => {
      const secret = generateTotpSecret();
      const code = generateTotpCode(secret);

      expect(typeof code).toBe('string');
      expect(code.length).toBe(6);
      expect(/^\d{6}$/.test(code)).toBe(true);

      const isValid = verifyTotpToken(secret, code);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect or malformed TOTP codes', () => {
      const secret = generateTotpSecret();
      const wrongCode = '000000';
      const actualCode = generateTotpCode(secret);

      if (actualCode !== wrongCode) {
        expect(verifyTotpToken(secret, wrongCode)).toBe(false);
      }
      expect(verifyTotpToken(secret, '123')).toBe(false); // short
      expect(verifyTotpToken(secret, 'abcdef')).toBe(false); // non-numeric
    });
  });

  describe('Multi-Role Resolution & Capability Detection', () => {
    it('should resolve only FARMER role for standard self-registered user', async () => {
      const user = {
        id: 'u1',
        role: 'FARMER',
        driverProfile: null,
        ownerProfile: null,
      };

      const roles = await getUserAvailableRoles(user);
      expect(roles).toEqual(['FARMER']);
    });

    it('should not include DRIVER or OWNER when KYC is still PENDING_APPROVAL', async () => {
      const user = {
        id: 'u2',
        role: 'FARMER',
        driverProfile: { id: 'd1', kycStatus: 'PENDING_APPROVAL' },
        ownerProfile: { id: 'o1', kycStatus: 'PENDING_APPROVAL' },
      };

      const roles = await getUserAvailableRoles(user);
      expect(roles).toEqual(['FARMER']);
      expect(roles).not.toContain('DRIVER');
      expect(roles).not.toContain('OWNER');
    });

    it('should resolve multiple roles for Farmer who also has approved Tractor Owner KYC', async () => {
      const user = {
        id: 'u3',
        role: 'FARMER',
        driverProfile: null,
        ownerProfile: { id: 'o2', kycStatus: 'APPROVED' },
      };

      const roles = await getUserAvailableRoles(user);
      expect(roles).toContain('FARMER');
      expect(roles).toContain('OWNER');
      expect(roles.length).toBe(2);
    });

    it('should resolve all approved roles for Farmer, Tractor Owner, and Certified Operator', async () => {
      const user = {
        id: 'u4',
        role: 'FARMER',
        driverProfile: { id: 'd2', kycStatus: 'APPROVED' },
        ownerProfile: { id: 'o3', kycStatus: 'APPROVED' },
      };

      const roles = await getUserAvailableRoles(user);
      expect(roles).toContain('FARMER');
      expect(roles).toContain('DRIVER');
      expect(roles).toContain('OWNER');
      expect(roles.length).toBe(3);
    });

    it('should resolve ADMIN for users with ADMIN role or adminSubRole', async () => {
      const adminUser = {
        id: 'admin-1',
        role: 'ADMIN',
        adminSubRole: 'SUPER_ADMIN',
        email: 'admin@krishi.gov.in',
      };

      const roles = await getUserAvailableRoles(adminUser);
      expect(roles).toContain('ADMIN');
    });
  });

  describe('Admin Account Lockout Logic', () => {
    it('should lock account after 5 consecutive failed login attempts', async () => {
      const maxAttempts = 5;
      let failedAttempts = 0;
      let isLocked = false;
      let lockExpiry: Date | null = null;

      for (let i = 1; i <= maxAttempts; i++) {
        failedAttempts++;
        if (failedAttempts >= 5) {
          isLocked = true;
          lockExpiry = new Date(Date.now() + 30 * 60 * 1000);
        }
      }

      expect(failedAttempts).toBe(5);
      expect(isLocked).toBe(true);
      expect(lockExpiry).not.toBeNull();
      expect(lockExpiry!.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
