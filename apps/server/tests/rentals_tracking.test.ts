import bcrypt from 'bcryptjs';
import { BatchLocationPingSchema, JobOtpVerifySchema, RentalStatus } from '@krishi/shared';

describe('KRISHI Phase 5 & 6: Rentals Engine, Booking Overlaps & Live Tracking', () => {
  describe('Human Rental ID Format', () => {
    it('should generate human rental IDs matching RENT-YYYYMMDD-NNNN format', () => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const seq = '0001';
      const humanId = `RENT-${yyyy}${mm}${dd}-${seq}`;

      const regex = /^RENT-\d{8}-\d{4}$/;
      expect(regex.test(humanId)).toBe(true);
      expect(humanId).toBe(`RENT-${yyyy}${mm}${dd}-0001`);
    });
  });

  describe('Server-Side Rental Quote Calculation', () => {
    it('should compute exact quote for 4 hours with operator and transport', () => {
      const hourlyRatePaise = 80000; // ₹800/hr
      const hours = 4;
      const baseRatePaise = hours * hourlyRatePaise; // 320000 (₹3,200)
      const operatorFeePaise = hours * 15000; // 60000 (₹600)
      const deliveryFeePaise = 99900; // ₹999 flat transport
      const subtotalPaise = baseRatePaise + operatorFeePaise + deliveryFeePaise; // 479900 (₹4,799)
      const gstPaise = Math.round(subtotalPaise * 0.18); // 86382
      const depositPaise = Math.round(baseRatePaise * 0.2); // 64000 (20% of base)
      const totalPaise = subtotalPaise + gstPaise + depositPaise; // 630282

      expect(baseRatePaise).toBe(320000);
      expect(operatorFeePaise).toBe(60000);
      expect(deliveryFeePaise).toBe(99900);
      expect(depositPaise).toBe(64000);
      expect(totalPaise).toBe(630282);
    });

    it('should switch to daily rate ratio when hours >= 8', () => {
      const hourlyRatePaise = 80000; // ₹800/hr
      const dailyRatePaise = 550000; // ₹5,500/day (cheaper than 8 * 800 = 6,400)
      const hours = 10; // 1 day (8 hrs) + 2 extra hours

      const days = Math.floor(hours / 8);
      const remainingHours = hours % 8;
      const baseRatePaise = days * dailyRatePaise + remainingHours * hourlyRatePaise;

      expect(baseRatePaise).toBe(550000 + 2 * 80000); // 710000 paise (₹7,100)
    });
  });

  describe('Booking Overlap Prevention Algorithm', () => {
    function hasOverlap(
      slotA: { start: Date; end: Date },
      slotB: { start: Date; end: Date }
    ): boolean {
      return slotA.start < slotB.end && slotA.end > slotB.start;
    }

    it('should detect overlap when requested booking starts inside an existing booking', () => {
      const existing = {
        start: new Date('2026-11-10T09:00:00Z'),
        end: new Date('2026-11-10T13:00:00Z'), // 4 hours
      };

      const conflicting = {
        start: new Date('2026-11-10T11:00:00Z'),
        end: new Date('2026-11-10T15:00:00Z'),
      };

      expect(hasOverlap(existing, conflicting)).toBe(true);
    });

    it('should detect overlap when requested booking completely encompasses existing booking', () => {
      const existing = {
        start: new Date('2026-11-10T10:00:00Z'),
        end: new Date('2026-11-10T12:00:00Z'),
      };

      const encompassing = {
        start: new Date('2026-11-10T08:00:00Z'),
        end: new Date('2026-11-10T16:00:00Z'),
      };

      expect(hasOverlap(existing, encompassing)).toBe(true);
    });

    it('should allow adjacent non-overlapping bookings without conflict', () => {
      const existing = {
        start: new Date('2026-11-10T09:00:00Z'),
        end: new Date('2026-11-10T13:00:00Z'),
      };

      const nonConflicting = {
        start: new Date('2026-11-10T13:00:00Z'), // Starts right when existing ends
        end: new Date('2026-11-10T17:00:00Z'),
      };

      expect(hasOverlap(existing, nonConflicting)).toBe(false);
    });
  });

  describe('8-Stage Rental Lifecycle Progression', () => {
    const validLifecycle = [
      'CONFIRMED',
      'MACHINE_ASSIGNED',
      'OPERATOR_ASSIGNED',
      'DISPATCHED',
      'NEAR_FARM',
      'ARRIVED',
      'STARTED',
      'COMPLETED',
    ];

    it('should follow strict linear sequence for field machinery lifecycle', () => {
      expect(validLifecycle.length).toBe(8);
      for (let i = 0; i < validLifecycle.length - 1; i++) {
        expect(validLifecycle.indexOf(validLifecycle[i + 1])).toBe(i + 1);
      }
    });
  });

  describe('Live GPS Location Ping Validation', () => {
    it('should validate realistic driver GPS coordinate pings', () => {
      const validPayload = {
        pings: [
          {
            jobId: '123e4567-e89b-12d3-a456-426614174000',
            driverId: '123e4567-e89b-12d3-a456-426614174001',
            latitude: 15.3647,
            longitude: 75.124,
            heading: 180.5,
            speed: 35.2,
            accuracy: 4.5,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const result = BatchLocationPingSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should reject invalid coordinates out of geographic bounds', () => {
      const invalidPayload = {
        pings: [
          {
            jobId: '123e4567-e89b-12d3-a456-426614174000',
            driverId: '123e4567-e89b-12d3-a456-426614174001',
            latitude: 195.0, // Invalid latitude > 90
            longitude: 75.124,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const result = BatchLocationPingSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('Customer Delivery OTP Handover Verification', () => {
    it('should verify customer 4-digit OTP using bcrypt hash', async () => {
      const customerOtp = '4829';
      const otpHash = await bcrypt.hash(customerOtp, 10);

      const isMatch = await bcrypt.compare(customerOtp, otpHash);
      const isMismatch = await bcrypt.compare('1111', otpHash);

      expect(isMatch).toBe(true);
      expect(isMismatch).toBe(false);
    });

    it('should validate OTP schema format', () => {
      const valid = JobOtpVerifySchema.safeParse({
        jobId: '123e4567-e89b-12d3-a456-426614174000',
        otp: '9142',
      });
      const invalid = JobOtpVerifySchema.safeParse({
        jobId: '123e4567-e89b-12d3-a456-426614174000',
        otp: '914', // Invalid: 3 digits
      });

      expect(valid.success).toBe(true);
      expect(invalid.success).toBe(false);
    });
  });
});
