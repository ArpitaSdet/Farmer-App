# 🌾 Farmer E-Commerce & Farm Machinery Rental — REST API Documentation

Base URL: `http://localhost:5000/api`

---

## 1. Authentication (`/api/auth`)

### Send OTP
- **Endpoint:** `POST /api/auth/send-otp`
- **Body:**
```json
{
  "mobileNumber": "9876543210"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to your mobile number",
  "devOtp": "1234"
}
```

### Verify OTP
- **Endpoint:** `POST /api/auth/verify-otp`
- **Body:**
```json
{
  "mobileNumber": "9876543210",
  "otp": "1234",
  "name": "Ramesh Patil",
  "village": "Unkal Village",
  "language": "kn"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1Ni...",
  "user": {
    "id": "user_farmer_1",
    "name": "Ramesh Patil",
    "role": "FARMER",
    "mobileNumber": "9876543210",
    "village": "Unkal Village",
    "district": "Dharwad"
  }
}
```

### Demo Quick Login
- **Endpoint:** `POST /api/auth/quick-login`
- **Body:** `{ "role": "FARMER" }` or `{ "role": "ADMIN" }`

---

## 2. Categories (`/api/categories`)
- `GET /api/categories`: Returns all agricultural categories (Seeds, Fertilizers, Crop Protection, Machinery, Irrigation, Tools, Animal Feed, Bio-Organic).

---

## 3. Products (`/api/products`)
- `GET /api/products`: Filter products.
  - Query parameters: `category`, `search`, `crop`, `brand`, `minPrice`, `maxPrice`, `sort` (`price_asc`, `price_desc`, `popular`, `rating`).
- `GET /api/products/featured`: Top rated farming products for Home screen.
- `GET /api/products/:id`: Full product detail with dosage, crops, and instructions.
- `POST /api/products` *(Admin)*: Add new product.
- `PUT /api/products/:id` *(Admin)*: Update product stock or price.
- `DELETE /api/products/:id` *(Admin)*: Remove product.

---

## 4. Farm Machinery (`/api/machines`)
- `GET /api/machines`: Filter farm machinery.
  - Query parameters: `type` (`Tractor`, `Harvester`, `Rotavator`, `Seed Drill`, `Sprayer`, `Cultivator`), `search`, `operatorAvailable` (`true`/`false`), `sort` (`distance`, `rate_asc`).
- `GET /api/machines/nearby`: Machines near farmer's village, sorted by distance.
- `GET /api/machines/:id`: Machine specs, horsepower, owner contact, and attachments.
- `POST /api/machines` *(Admin/Owner)*: Register farm machinery.
- `PUT /api/machines/:id` *(Admin/Owner)*: Update hourly rate or availability.

---

## 5. Machinery Rental Bookings (`/api/rentals`)
- `POST /api/rentals`: Create multi-step rental booking.
  - Request body includes: `machineId`, `startDate`, `startTime`, `durationHours`, `durationDays`, `withOperator`, `withDelivery`, `deliveryAddress`, `paymentMethod`.
- `GET /api/rentals`: Get farmer's machinery bookings.
- `GET /api/rentals/:id`: Tracking details with 7-stage status pipeline:
  1. Booking Accepted
  2. Machine Preparing
  3. Machine Dispatched
  4. Machine Near You
  5. Machine Delivered to Farm
  6. Rental Work In Progress
  7. Rental Completed
- `PUT /api/rentals/:id/status` *(Admin/Owner)*: Advance status pipeline.
- `PUT /api/rentals/:id/cancel`: Cancel booking.

---

## 6. Product Orders (`/api/orders`)
- `POST /api/orders`: Place product order from cart items. Calculates total, checks free farm delivery above ₹1000, generates UPI intent or COD.
- `GET /api/orders`: Get farmer's product orders.
- `GET /api/orders/:id`: 4-step delivery tracking steps:
  1. Order Confirmed
  2. Packed at Agro Center
  3. Dispatched with Delivery Van
  4. Delivered to Farm
- `PUT /api/orders/:id/status` *(Admin)*: Advance delivery step.
- `PUT /api/orders/:id/cancel`: Cancel order.

---

## 7. Dynamic Banners & Posters (`/api/banners`, `/api/posters`)
- `GET /api/banners`: Active promotional banners for carousel. Fallback to default agricultural banner if none active.
- `GET /api/posters`: Active promotional posters for home cards.
- `POST /api/banners` *(Admin)*: Create dynamic campaign banner.
- `POST /api/posters` *(Admin)*: Create dynamic campaign poster.

---

## 8. Notifications & Farmer Support (`/api/notifications`, `/api/support`)
- `GET /api/notifications`: Get farmer notifications with unread count.
- `PUT /api/notifications/:id/read`: Mark notification as read.
- `GET /api/support/faqs`: Agricultural FAQs and Toll-Free Helpline info (1800-180-1551).
- `POST /api/support/ticket`: Submit problem report for Kisan Sahayak team.

---

## 9. Admin Dashboard (`/api/admin`)
- `GET /api/admin/stats`: Overview platform statistics (Farmers, Products, Machinery, Orders, Rentals, Revenue).
- `GET /api/admin/farmers`: View and search registered farmers.
- `PUT /api/admin/farmers/:id/block`: Toggle block/unblock farmer.
- `GET /api/admin/orders`: View and manage all platform orders.
- `GET /api/admin/rentals`: View and manage all machinery rentals.
