# Deploying Kisan Kendra (free: Render + Neon)

One Render web service runs everything: the API + Socket.IO, the farmer web app at `/`, and the admin console at `/admin`.

## 1. Database (Neon, free)
1. Sign in at https://neon.tech and create a project (region: Singapore / Mumbai).
2. Copy the **pooled connection string** (`postgresql://...neon.tech/neondb?sslmode=require`).

## 2. Code on GitHub
Render deploys from a Git repository. Push this folder (`Farmer app/`) to a new GitHub repo.

## 3. Render
1. Sign in at https://render.com → **New → Blueprint** → pick the repo. Render reads `render.yaml`.
2. When asked for `DATABASE_URL`, paste the Neon string.
3. Deploy. On first start the server creates the tables and loads the demo data (`seedDemo`).

Your URL will be `https://kisan-kendra-api.onrender.com` (or similar if the name is taken).
- Farmer web app: `/`
- Admin console: `/admin` → `admin@kisankendra.in` / `Admin@123`
- Health check: `/ready`

Free Render services sleep after 15 min idle; the first request then takes ~30–50 s.

## 4. Point the Android app at it
The APK uses `https://kisan-kendra-api.onrender.com` by default (`frontend/app.json → expo.extra.apiUrl`).
If your Render URL differs, either tap **Server:** on the login screen and enter it, or change `apiUrl` and rebuild:

```bash
cd frontend/android && ./gradlew assembleRelease
```

## Demo logins (OTP is always 123456 while DEMO_MODE=true)
| Role | Phone |
|---|---|
| Farmer | 9876543210 |
| Machine owner | 9845000001 |
| Driver | 9900000001 |

## Going live for real
Set `DEMO_MODE=false`, then add `SMS_PROVIDER` + MSG91/Twilio keys and Razorpay keys (see `SETUP.md`).
