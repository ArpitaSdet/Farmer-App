# KRISHI Platform — External Accounts & Credentials Setup Guide (SETUP.md)

This platform requires real external credentials for production deployment. When an external credential is missing, the corresponding service will throw a descriptive setup error pointing to this file.

---

## 1. Credentials Checklist & `.env` Variable Mapping

| Provider | Purpose | Environment Variables | Where to Obtain |
| :--- | :--- | :--- | :--- |
| **PostgreSQL** | Primary Database | `DATABASE_URL` | Local Docker, Railway, Supabase, or AWS RDS |
| **Redis** | Sessions, Queues, Sockets | `REDIS_URL` | Local Docker, Railway Redis, Upstash, or Redis Cloud |
| **SMS OTP** | Phone Authentication | `SMS_PROVIDER` (`msg91` or `twilio`)<br>`MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`<br>`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SERVICE_SID` | [MSG91](https://msg91.com) or [Twilio Verify](https://www.twilio.com/en-us/verify) |
| **Razorpay** | Payments, Webhooks, Refunds | `RAZORPAY_KEY_ID`<br>`RAZORPAY_KEY_SECRET`<br>`RAZORPAY_WEBHOOK_SECRET` | [Razorpay Dashboard](https://dashboard.razorpay.com/) $\rightarrow$ Settings $\rightarrow$ API Keys |
| **Google Maps** | Driving ETA, Geocoding, Places, Polyline | `GOOGLE_MAPS_SERVER_KEY`<br>`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/) $\rightarrow$ APIs & Services |
| **S3 / R2** | Product/Machine Image Storage | `S3_BUCKET_NAME`<br>`S3_REGION`<br>`S3_ACCESS_KEY_ID`<br>`S3_SECRET_ACCESS_KEY`<br>`S3_ENDPOINT` (optional for Cloudflare R2) | AWS S3, Cloudflare R2, or MinIO |
| **Expo Push** | Push Notifications | `EXPO_ACCESS_TOKEN` | [Expo Dashboard](https://expo.dev/) $\rightarrow$ Project Access Tokens |
| **Sentry** | Error Monitoring | `SENTRY_DSN`<br>`EXPO_PUBLIC_SENTRY_DSN` | [Sentry.io](https://sentry.io/) Project Settings |
| **AI Generation**| AI Creative Studio Banners | `AI_PROVIDER` (`openai` or `gemini`)<br>`AI_API_KEY` | OpenAI API or Google AI Studio |
| **JWT Secrets** | Auth & Session Security | `JWT_ACCESS_SECRET`<br>`JWT_REFRESH_SECRET` | Generate with `openssl rand -hex 32` |

---

## 2. Step-by-Step Instructions

### A. Database & Redis Setup
1. **Local Development (Fastest):**
   Run the included Docker Compose configuration:
   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```
   This provisions:
   - PostgreSQL 16 + PostGIS extension on port `5432` (`postgres:postgres@localhost:5432/krishi_db`)
   - Redis 7 on port `6379`
2. **Cloud / Production (Railway):**
   - In Railway, click **+ New** $\rightarrow$ **Database** $\rightarrow$ **PostgreSQL**.
   - Click **+ New** $\rightarrow$ **Database** $\rightarrow$ **Redis**.
   - Copy the connection strings into your `DATABASE_URL` and `REDIS_URL`.

### B. SMS OTP Authentication (MSG91 or Twilio)
- **For MSG91:**
  1. Register at [MSG91](https://msg91.com).
  2. Create an OTP template with variable `##OTP##`.
  3. Set `SMS_PROVIDER=msg91`, `MSG91_AUTH_KEY=your_key`, and `MSG91_TEMPLATE_ID=your_template_id`.
- **For Twilio Verify:**
  1. Register at [Twilio](https://twilio.com).
  2. Create a "Verify Service".
  3. Set `SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID=...`, `TWILIO_AUTH_TOKEN=...`, and `TWILIO_SERVICE_SID=...`.

### C. Razorpay Payment Gateway
1. Create a Razorpay account at [dashboard.razorpay.com](https://dashboard.razorpay.com).
2. Go to **Settings $\rightarrow$ API Keys** and generate Test/Live keys.
3. Under **Webhooks**, add your server endpoint: `https://your-domain.com/api/v1/webhooks/razorpay`.
4. Subscribe to events: `order.paid`, `payment.failed`, `refund.processed`.
5. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`.

### D. Google Maps & Directions API
1. Enable the following APIs in [Google Cloud Console](https://console.cloud.google.com):
   - **Maps SDK for Android**
   - **Maps SDK for iOS**
   - **Directions API** (for driver-to-farm routing and ETA)
   - **Geocoding API**
   - **Places API**
2. Restrict the keys accordingly (Android package name / iOS bundle ID for mobile, IP restricted for server).

### E. Object Storage (AWS S3 or Cloudflare R2)
1. Create an S3 or Cloudflare R2 bucket named `krishi-assets`.
2. Configure CORS to allow `GET`, `PUT`, `POST` from your app and console domains.
3. Attach an IAM user with `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject`.

---

## 3. Bootstrapping First Super Admin
Once the database is running and migrated, run:
```bash
cd apps/server && npm run bootstrap-admin
```
This CLI prompt securely provisions the first Super Admin with mobile number, name, and initial credentials. No default credentials exist.
