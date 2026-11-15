import { assertEnv } from '../src/config/env';

describe('KRISHI Phase 2: Catalog & Admin Core Tests', () => {
  describe('Stock & Price Calculations', () => {
    it('should correctly convert rupees to paise as integer', () => {
      const priceRupees = 499.5;
      const pricePaise = Math.round(priceRupees * 100);
      expect(Number.isInteger(pricePaise)).toBe(true);
      expect(pricePaise).toBe(49950);
    });

    it('should calculate GST breakdown accurately from paise', () => {
      const totalPaise = 11800; // ₹118.00 with 18% GST included
      const gstRate = 18;
      const basePaise = Math.round(totalPaise / (1 + gstRate / 100)); // 10000 paise (₹100)
      const gstPaise = totalPaise - basePaise; // 1800 paise (₹18)

      expect(basePaise).toBe(10000);
      expect(gstPaise).toBe(1800);
      expect(basePaise + gstPaise).toBe(totalPaise);
    });
  });

  describe('External Credentials Assertion (No Silent Mocking)', () => {
    it('should fail with a clear setup error if S3 bucket credentials are missing', () => {
      expect(() => {
        assertEnv('S3_BUCKET_NAME' as any, 'S3/R2 Cloud Storage');
      }).toThrow(/\[CONFIGURATION_ERROR\] Missing environment variable 'S3_BUCKET_NAME'/);
    });

    it('should fail with a clear setup error if Razorpay key is missing', () => {
      expect(() => {
        assertEnv('RAZORPAY_KEY_ID' as any, 'Razorpay Payment Gateway');
      }).toThrow(/\[CONFIGURATION_ERROR\] Missing environment variable 'RAZORPAY_KEY_ID'/);
    });
  });

  describe('Haversine Geolocation Distance Calculation', () => {
    function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371;
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

    it('should calculate accurate distance between two farm coordinates', () => {
      // Hubballi (15.3647, 75.1240) to Dharwad (15.4589, 75.0078) ~ 16 km
      const distance = calculateDistanceKm(15.3647, 75.1240, 15.4589, 75.0078);
      expect(distance).toBeGreaterThan(14);
      expect(distance).toBeLessThan(18);
    });
  });
});
