# KRISHI Platform — Deferred Features (Phase 6 Architecture Specifications)

This document formalizes the specifications, schemas, external integrations, and architectural guidelines for features intentionally deferred from the MVP to preserve core production stability.

---

## 1. Coupons UI for Farmers
- **Status:** Deferred to v1.1. Backend schema (`model Coupon`) and endpoints (`POST /api/v1/cart/coupon`, `orderController`) are already operational.
- **Scope:**
  - Dedicated "Apply Coupon" modal on Cart & Checkout screens.
  - Farmer-friendly promo code cards (e.g. `RABI2026`, `KISANFIRST`).
  - Validation: Min order amount in paise, maximum discount cap in paise, one-time usage per farmer phone number.
- **Target File:** `frontend/src/screens/CartScreen.js`
- **TODO Stub:**
  ```javascript
  // TODO [Phase 6 - Coupons UI]: Wire visual promo voucher selector modal calling POST /api/v1/cart/coupon
  ```

---

## 2. Product Reviews UI for Farmers
- **Status:** Deferred to v1.1. Backend schema (`model Review`) already exists.
- **Scope:**
  - Star rating (1-5) and text feedback modal on delivered product orders.
  - Verified Purchase badge enforced via server-side order check (`isVerifiedPurchase = true`).
  - Aggregation engine to dynamically recalculate `product.rating` and update variant popularity.
- **Target Files:** `frontend/src/components/ProductDetailModal.js`, `frontend/src/screens/OrdersScreen.js`
- **TODO Stub:**
  ```javascript
  // TODO [Phase 6 - Product Reviews]: Connect farmer review submission dialog to POST /api/v1/catalog/products/:id/reviews
  ```

---

## 3. Real Vernacular Voice Search (Speech-to-Text)
- **Status:** Deferred to v1.2. Mic icon currently hidden in `SearchBarWithVoice.js`.
- **Scope:**
  - Real speech recognition for Indian agricultural vernaculars: Hindi, Kannada, Marathi, Telugu, Tamil.
  - Integration candidates: **Bhashini API** (Govt. of India National Language Translation Mission) or Google Cloud Speech-to-Text.
  - Acoustic models tuned for rural agricultural terminology (e.g., "dap gombu", "rotavator bhade", "tamatar beej").
- **Target Files:** `frontend/src/components/SearchBarWithVoice.js`
- **TODO Stub:**
  ```javascript
  // TODO [Phase 6 - Vernacular Voice Search]: Integrate Bhashini STT SDK with offline keyword spotting for Kannada/Hindi
  ```

---

## 4. Weather & APMC Mandi Prices
- **Status:** Deferred to v1.1.
- **Scope:**
  - Live district-level mandi prices via Agmarknet Government API (data.gov.in).
  - Hyper-local 5-day weather forecast via IMD (India Meteorological Department) or OpenWeather Agro API.
  - Rainfall warnings and spraying advisory ("Ideal spraying window: Next 4 hours").
- **Target Files:** `frontend/src/screens/HomeScreen.js`, `apps/server/src/services/mandiService.ts`
- **TODO Stub:**
  ```javascript
  // TODO [Phase 6 - Mandi & Weather]: Fetch live Hubballi/Dharwad APMC mandi prices from Agmarknet API and render ticker
  ```

---

## 5. AI Crop Advisory Chat
- **Status:** Deferred to v1.2.
- **Scope:**
  - Image-based pest/crop disease diagnostics using Gemini Vision API.
  - Vernacular chat interface answering crop protection, dosage, and fertilizer scheduling questions.
  - Safety filter restricting recommendations strictly to CIBRC (Central Insecticides Board & Registration Committee) approved chemicals.
- **Target Files:** `frontend/src/screens/ProfileScreen.js`, `apps/server/src/services/cropAdvisory.ts`
- **TODO Stub:**
  ```javascript
  // TODO [Phase 6 - AI Crop Doctor]: Connect photo upload to Gemini 1.5 Flash Vision for pest/leaf disease classification
  ```

---

## 6. Loyalty & Referral Programs (Kisan Coins)
- **Status:** Deferred to v1.2.
- **Scope:**
  - "Refer a Fellow Farmer" scheme with unique referral links/SMS.
  - Earn Krishi Points on machine bookings and seed purchases.
  - Redeem points for discounts on machinery rental deposits or delivery fee waivers.
- **Target Files:** `frontend/src/screens/ProfileScreen.js`
- **TODO Stub:**
  ```javascript
  // TODO [Phase 6 - Kisan Loyalty]: Introduce referral wallet ledger and points redemption at checkout
  ```

---

## 7. Multi-Vendor Marketplace Sellers
- **Status:** Deferred to v2.0. The platform currently operates as a curated 1P cooperative model.
- **Scope:**
  - Dedicated Seller Portal for licensed local agricultural dealers and cooperatives.
  - Vendor onboarding with GSTIN, pesticide license, seed dealer license verification.
  - Automated split payouts via Razorpay Route / Escrow.
- **Target Files:** `apps/admin/src/components/CatalogManager.tsx`, `apps/server/src/controllers/adminCatalogController.ts`
- **TODO Stub:**
  ```typescript
  // TODO [Phase 6 - Multi-Vendor Marketplace]: Implement vendor tenant isolation and Razorpay Route automated commissions
  ```

---

## 8. In-App Realtime Chat
- **Status:** Deferred to v1.2. Phone call via helpline and WhatsApp links are active in MVP.
- **Scope:**
  - In-app messaging between Farmer ↔ Machine Owner during booking negotiation.
  - In-app chat between Farmer ↔ Driver for delivery landmark directions.
  - Pre-translated quick chips (e.g. "I am waiting at the farm gate", "Please bring 2 extra diesel cans").
- **Target Files:** `frontend/src/screens/OrdersScreen.js`, `apps/server/src/services/realtimeService.ts`
- **TODO Stub:**
  ```javascript
  // TODO [Phase 6 - In-App Chat]: Wire Socket.IO bidirectional chat channel with quick audio notes and location sharing
  ```
