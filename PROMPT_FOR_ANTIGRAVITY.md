# Kisan Kendra — finish the upgrade properly (work in phases, verify each one)

You are editing the repo in this folder (`Farmer app/Farmer app`). Previous work left **uncommitted changes** in:
`apps/server/src/{config/env.ts, server.ts, services/events.ts, services/pushNotification.ts, services/marketService.ts, routes/marketRoutes.ts}`,
`apps/admin/src/components/Overview.tsx`, `frontend/{App.js, app.json, package.json}`,
`frontend/src/{context/AuthContext.js, context/LanguageContext.js, components/MachineCard.js, screens/HomeScreen.js, screens/LoginScreen.js, screens/AdminScreen.js, services/api.js}`.

**Start by running `git status` and `git diff`, read every changed file, and finish/repair that work instead of starting over.**

## How you must work
- Do the phases **in order**. After each phase run its checks, fix all errors, then `git commit` with a clear message. Do not move to the next phase with failing checks.
- Never leave a feature half-done or a `TODO` in place of code. If something needs a paid account/API key, implement it fully behind an env variable and keep the app working when the key is missing.
- Keep existing architecture: server events go through `apps/server/src/services/events.ts`; order/rental status changes go through `apps/server/src/services/lifecycle.ts`; the app subscribes with `useRealtime` from `frontend/src/services/realtime.js`; API calls go through `frontend/src/services/api.js`.
- Expo SDK 58 / React Native 0.88: check https://docs.expo.dev/versions/v58.0.0/ for any Expo API; install packages only with `npx expo install <pkg>`. Never hand-edit `frontend/android` except where Phase 6 says so.
- Never commit secrets (`.env`, keystores, API keys).
- At the end you **must** push to GitHub and build the APK (Phase 6). Changes that are not pushed and built are invisible to the user.

---

## Phase 1 — Admin portal INSIDE the app (no browser, same window)
Today the login screen's "Admin panel" button opens the browser. Replace this with a native admin area inside the app.

1. **Login:** On `LoginScreen.js`, the "Admin panel" button opens an in-app admin login form (email + password, show/hide password) — no `Linking.openURL`. Submit to `POST /api/v1/auth/admin/login` (response: `data.tokens.accessToken`, `data.user`). Start the session through `AuthContext` with role `ADMIN` (finish the `directSession` code already started there) and persist it like other sessions.
2. **Routing:** In `App.js`, `user.role === 'ADMIN'` renders `AdminScreen` (never the farmer `BottomNavigator`). Logout returns to the login screen.
3. **AdminScreen.js** — a native React Native admin console with a bottom tab bar (same visual style as the farmer app, dark slate `#37474F` header). Tabs and the existing server endpoints they use:
   - **Dashboard**: KPI cards from `GET /admin/stats` + a live activity list fed by socket events `order:updated`, `rental:updated`, `location:update`.
   - **Orders**: list from `GET /admin/orders` with filter chips (Active / All / each status); action buttons per status → `POST /admin/orders/:id/status` with `CONFIRMED`, `PACKED` (auto-assigns driver), `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED` (confirm dialog). Rentals list from `GET /admin/rentals`.
   - **Catalog**: `GET /admin/products`; per variant +10 / +50 / −1 stock (`POST /admin/products/stock/adjust` with `{variantId, quantity, type, reason}`), Hide/Publish (`POST /admin/products/:id/toggle`); coupons list + create (`GET/POST /admin/coupons`).
   - **People**: KYC (`GET /admin/kyc`, approve/reject → `POST /admin/kyc/owners/:id/review` or `/admin/kyc/drivers/:id/review` with `{action:'APPROVE'|'REJECT', rejectionReason}`), users list with block/unblock (`GET /admin/users`, `POST /admin/users/:id/block`), drivers & live positions (`GET /admin/drivers`, socket `location:update`).
   - **More**: service areas (`GET/POST /admin/service-areas`), audit log (`GET /admin/audit-logs`), logout.
4. **Real-time:** every tab refreshes itself on the relevant socket events (`order:updated`, `rental:updated`, `stock:updated`, `catalog:changed`, `coupons:changed`, `user:updated`, `job:updated`, `machine:updated`). The admin socket must join the `admin` room (server already does this for role ADMIN tokens). No pull-to-refresh needed, but keep it available.
5. Admin access token from `/auth/admin/login` expires (12 h in demo, 30 min otherwise): on 401, log out cleanly with a message.

**Checks:** app bundles (`cd frontend && npx expo export --platform web --output-dir dist`), log in as `admin@kisankendra.in / Admin@123`, confirm + pack an order from the app and see the farmer's order update live in a second session. Commit.

## Phase 2 — Mobile compatibility (all screens, all roles)
Make every screen work well on small (360×640), normal and large phones, Android 7–15, with the keyboard open and with large system font.
- Replace `SafeAreaView` from `react-native` with `react-native-safe-area-context` (`SafeAreaProvider` in `App.js`, `useSafeAreaInsets` for headers/bottom bars). Respect the Android gesture bar and notch; no content under the status bar.
- Android hardware **back button** (`BackHandler`): closes open modals first (cart, product detail, booking, chat, OTP dialog), then goes to the previous tab, then asks "Exit app?" on Home. Admin tabs behave the same.
- Forms (login, OTP, checkout, booking, add machine, chat, admin login) use `KeyboardAvoidingView`/scroll so inputs and buttons are never hidden by the keyboard.
- No horizontal overflow: long product/machine names wrap or truncate (`numberOfLines`), cards use flexible widths (no fixed pixel widths wider than 320), images use `resizeMode="cover"` with aspect ratios.
- Touch targets ≥ 44 px, text readable at 1.3× font scale (`allowFontScaling` stays on; check nothing clips).
- Modals: full-screen on phones, proper close button, scrollable content.
- Loading, empty and error states on every list (spinner, friendly empty message, "Retry" button) — never a blank screen. Add an app-wide offline banner when the socket/API is unreachable.

**Checks:** run the web export at mobile width and fix layout issues; build APK in Phase 6 and test on a small and a large emulator. Commit.

## Phase 3 — Live mandi prices + weather (finish what was started)
- `apps/server/src/services/marketService.ts` + `routes/marketRoutes.ts`: weather from Open-Meteo (no key) for the user's coordinates; mandi prices from data.gov.in Agmarknet (`DATA_GOV_API_KEY`) filtered by state/district/commodity. Cache in memory, refresh every 30 min, then `broadcast('market:updated', data)`. Must not crash or block startup if the API fails; return the last good data with its timestamp.
- Make sure the route is mounted in `server.ts` at `/api/v1/market`.
- `HomeScreen.js`: card shows real values + "Updated hh:mm"; badge "LIVE" only if data is < 60 min old; subscribes to `market:updated`; hides cleanly if unavailable. Admin Dashboard shows the same.

**Checks:** `cd apps/server && npx tsc --noEmit`; `curl /api/v1/market` returns real weather. Commit.

## Phase 4 — Production features (real, not demo)
Implement fully; each works when its env keys are set and degrades gracefully when not. `DEMO_MODE=true` keeps today's demo behaviour; `DEMO_MODE=false` turns all demo shortcuts off.
1. **Config endpoint** `GET /api/v1/config` → `{ demoMode, razorpayKeyId }`. Login screen hides demo cards and demo OTP when `demoMode` is false.
2. **SMS OTP (MSG91)**: random 6-digit OTP, DLT template, resend button with 30 s timer.
3. **Razorpay**: in-app checkout for orders and rental advance; server verifies signature (`/orders/:id/verify-payment`) and webhook; on success `paymentStatus=PAID` then `publishOrder`/`publishRental`; refund on cancellation of paid orders.
4. **Push notifications** with `expo-notifications`: register token after login (`POST /api/v1/notifications/device-token`, model `DeviceToken`); `notifyUser` in `events.ts` also sends Expo push; tapping opens the related order/rental/job.
5. **Image upload** (Cloudflare R2/S3 presigned URL, `S3_*` env): admin product images, owner machine photo (`expo-image-picker`), KYC photos.
6. **Owner self sign-up** screen (`POST /api/v1/auth/owner/signup`) → admin approves in People tab → owner notified live.
7. **Invoice PDF** `GET /api/v1/orders/:id/invoice.pdf` (pdfkit) + "Download invoice" on delivered orders.

**Checks:** server `npx tsc --noEmit` and `npm test` pass; add tests for OTP, payment signature verification and that status changes emit `order:updated` to farmer + admin. Commit.

## Phase 5 — UI fixes
- `LanguageContext.js`: default = user's `preferredLang` (fallback English), persisted in AsyncStorage, saved to server with `PUT /auth/me`.
- `MachineCard.js`: show horsepower only if the machine has it (add `horsepower String?` to Prisma `Machine` + seed values); location as `village, district` once.
- Home banners from the server; hard-coded `DEFAULT_BANNERS` only when offline.

Commit.

## Phase 6 — Ship it (mandatory)
1. `cd apps/server && npx prisma generate && npx tsc --noEmit`; `cd apps/admin && npx tsc --noEmit && npx vite build`.
2. If the Prisma schema changed, the server's start command already runs `prisma db push`; make sure the change is non-destructive.
3. Rebuild the web app: `cd frontend && npx expo export --platform web --output-dir dist` (this folder is committed; use `git add -f frontend/dist`).
4. Bump `frontend/app.json` → `version` and `android.versionCode` (+1).
5. `git push origin HEAD:main` → Render redeploys automatically; wait for it and check `https://farmer-app-klid.onrender.com/ready` returns `{"status":"ready","database":"connected"}` and `/api/v1/market` works.
6. Build the APK: `cd frontend && npx expo prebuild --platform android`, make sure `frontend/android/local.properties` has `sdk.dir`, and `frontend/android/gradle.properties` keeps `android.enableMinifyInReleaseBuilds=false` (R8 made the app close on launch before). Then `cd android && ./gradlew assembleRelease`.
7. Install `frontend/android/app/build/outputs/apk/release/app-release.apk` on an emulator or phone, cold-start it, log in as farmer, owner, driver and admin, and confirm it does not close itself. Copy it to the project root as `KisanKendra-v<version>.apk`.
8. Update `APP_LOGIN_DETAILS.txt`, `docs/FEATURE_AUDIT.md`, `.env.example`, `SETUP.md`.

## Final report (required)
List: what changed per phase, the commit hashes, the APK file name + version, test results, and the exact environment variables the owner must add in Render to switch from demo to production (`DEMO_MODE=false`, `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `DATA_GOV_API_KEY`, `EXPO_ACCESS_TOKEN`, `S3_*`).
