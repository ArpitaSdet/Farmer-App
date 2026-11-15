# Kisan Kendra — Feature Audit (2026-11-14)

## Working end-to-end (verified)
- Phone OTP login (demo OTP 123456), multi-role profile pick, persisted session
- Demo accounts: Farmer 9876543210 · Owner 9845000001 · Driver 9900000001 · Admin web admin@kisankendra.in / Admin@123
- Catalog: 7 categories, 15 products with variants/stock/images, 12 machines with owners
- Server-side cart, coupons (KISANFIRST, RABI2026, DRIP500), checkout (COD + simulated online pay), GST invoice
- Order lifecycle: placed → admin confirm/pack (auto driver assign) → driver pickup → delivery OTP → delivered
- Machine rental: booking with pricing/GST/deposit, owner accept/decline, driver handover OTP, work start/complete, cancel
- Realtime (Socket.IO): order/rental status, notifications + toast, live stock, machine availability, driver location + ETA, reviews, admin feed
- In-app chat farmer↔driver / farmer↔owner (persisted)
- Product reviews (verified purchase badge), FAQs, support tickets, profile edit
- Owner app (bookings, machines, add machine, availability, earnings) and Driver app (jobs, OTP handover, COD, GPS/simulated tracking, history)
- Admin web console at /admin (live): KPIs + live activity feed, order confirm/pack/cancel with auto driver dispatch, rentals, stock adjust & publish toggle, coupons, driver telemetry & fleet, owner/driver KYC approve/reject, user block/unblock, service areas, audit trail

## Still missing / not done
- Real payment gateway (Razorpay keys), real SMS OTP (MSG91/Twilio), push notifications (FCM/Expo)
- Mandi prices & weather (home card is static), voice search, AI crop doctor, loyalty/referrals, multi-vendor sellers
- Image upload for products/machines, invoice PDF, returns/refund flow, owner/driver self sign-up UI
