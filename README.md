# 🌾 Kisan Kendra (ಕಿಸಾನ್ ಕೇಂದ್ರ / किसान केंद्र)
### Production-Ready Farmer E-Commerce & Farm Machinery Rental Mobile Application

A specialized, farmer-first mobile application built exclusively for Indian agriculture. It combines two core agricultural services in one unified platform:
1. **BUY FARMING PRODUCTS:** Certified seeds, fertilizers, crop protection, tools, irrigation, animal feed, and bio-organic inputs.
2. **RENT FARM MACHINERY:** Tractors, harvesters, rotavators, seed drills, boom sprayers, cultivators, and power tillers with transparent hourly/daily pricing, operator options, and farm delivery.

---

## 📱 Highlights & Farmer-First Design
- **Distinct Indian Agriculture Identity:** Designed specifically for Indian farmers with lush agricultural greens, soil browns, and harvest golden amber accents. Zero generic e-commerce clutter.
- **Extreme Simplicity & Accessibility:** High contrast, large touch targets (minimum 48–56px), readable fonts, clear visual badges, minimal text per screen, and zero confusing multi-tier dropdowns.
- **6 Indian Languages Supported:** Full localization system covering:
  - English
  - Kannada (ಕನ್ನಡ)
  - Hindi (हिन्दी)
  - Marathi (मराठी)
  - Telugu (తెలుగు)
  - Tamil (தமிழ்)
- **Voice Search Integration:** Microphone button with audio pulse animation and quick voice prompt suggestions (e.g., *"Tractor rent"*, *"Tomato seeds"*, *"Urea"*).
- **Location & Distance Engine:** GPS auto-detection plus manual village, taluk, district, and pincode selector (e.g. Hubballi, Belagavi, Haveri). Dynamically calculates distance to nearby machinery.
- **Multi-Step Machinery Rental Engine:**
  - Date & start time selection
  - Duration picker (hours or full days)
  - With / without operator toggle
  - Deliver to farm field vs self-pickup from owner
  - Transparent fare breakdown (Base rate + Operator charge + Delivery fee + Security deposit)
  - **7-Stage Live Machinery Tracking:**
    `Booking Accepted` ➔ `Machine Preparing` ➔ `Machine Dispatched` ➔ `Machine Near You` ➔ `Delivered to Farm` ➔ `Work In Progress` ➔ `Completed`
- **Product Store & Checkout:**
  - Crop compatibility filters, dosage guidelines, application instructions
  - Cart with free farm delivery for orders over ₹1000
  - UPI Payment (PhonePe, GPay, Paytm, BHIM) and Cash on Delivery (COD)
  - **4-Stage Delivery Tracking:** `Placed` ➔ `Packed` ➔ `Shipped` ➔ `Delivered`
- **Dynamic Banners & Poster Engine:** Home screen promotional banners and seasonal posters managed dynamically via the Admin Panel without app code changes.
- **Farmer Support Center:** Toll-Free Helpline (`1800-180-1551`), WhatsApp expert chat, FAQs, and complaint ticket system.
- **Integrated Admin Dashboard:** Comprehensive management for farmers, products, machinery, orders, rental bookings, and promotional banners.

---

## 🏗️ Project Architecture

```
Farmer app/
├── backend/                  # Node.js + Express REST API Server
│   ├── config/
│   │   ├── db.js             # Repository DB layer (Persistent disk DB + Postgres/Mongo adapters)
│   │   ├── payments.js       # UPI intent & Payment gateway abstraction
│   │   ├── storage.js        # File upload storage abstraction (Local disk + S3 ready)
│   │   └── notifications.js  # Push notifications & SMS gateway abstraction
│   ├── controllers/          # Auth, Products, Machines, Rentals, Orders, Banners, Support, Admin
│   ├── middleware/           # JWT auth, role validation, farmer-friendly error handler
│   ├── routes/               # Modular Express API routes
│   ├── utils/                # Seed script with rich Indian agricultural products & machines
│   ├── server.js             # Server entry point (Port 5000)
│   └── package.json
│
├── frontend/                 # React Native Mobile Application (Expo & Web support)
│   ├── src/
│   │   ├── theme/            # Agricultural Color System, Spacing, Typography
│   │   ├── localization/     # i18n manager and translations (en, kn, hi, mr, te, ta)
│   │   ├── context/          # AuthContext, CartContext, LocationContext, LanguageContext
│   │   ├── services/         # api.js REST API client with offline/cached support
│   │   ├── components/       # Header, SearchBarWithVoice, BannerCarousel, CategoryGrid,
│   │   │                     # MachineCard, ProductCard, QuickActions, BookingModal,
│   │   │                     # ProductDetailModal, VoiceSearchModal, LocationSelectorModal,
│   │   │                     # LanguageSelectorModal, FarmerBenefits, OfflineBanner
│   │   ├── screens/          # HomeScreen, ShopScreen, RentScreen, OrdersScreen,
│   │   │                     # ProfileScreen, CartScreen, AdminScreen
│   │   └── navigation/       # BottomNavigator (Home, Shop, Rent, Orders, Profile)
│   ├── App.js                # Root application entry
│   ├── app.json              # Expo configuration
│   └── package.json
│
├── docs/
│   ├── API_DOCUMENTATION.md  # Detailed REST API endpoints and payloads
│   ├── schema_postgresql.sql # Production PostgreSQL DDL schema with indexes
│   └── schema_mongodb.js     # Production MongoDB Mongoose models
└── package.json              # Root workspace runner scripts
```

---

## 🚀 How to Run

### Prerequisites
- Node.js (v18+ or v22)
- npm

### 1. Start the Backend Server
```bash
cd backend
npm install
npm start
```
- Server starts on `http://localhost:5000`.
- Automatically seeds categories, products, machinery, banners, orders, and notifications if empty.
- To re-seed fresh data: `npm run seed`.

### 2. Start the React Native Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm run web
```
- Or run in Android emulator / physical device via Expo Go:
```bash
npm run android
```

---

## 💳 Payment Architecture
- **UPI Deep-Linking:** Automatically generates `upi://pay?pa=farmerhub@upi&pn=KisanSeva&am=...` for PhonePe, Google Pay, and Paytm.
- **Cash on Delivery (COD):** Seamless option for farmers paying when products reach the farm gate.
- **Cash After Work:** Special machinery rental option allowing payment to the tractor owner after field ploughing or harvesting is finished.

---

## 🗄️ Database Options
- **Out-of-the-Box:** File-backed persistent JSON database (`backend/data/db.json`) requiring zero database installation.
- **Production PostgreSQL:** DDL schema provided in `docs/schema_postgresql.sql` with tables, enums, foreign keys, and indexes.
- **Production MongoDB:** Mongoose schema provided in `docs/schema_mongodb.js`.
