# Kisan Kendra — real live location tracking (ask permission, real GPS, live map)

Work in this repo (`Farmer app/Farmer app`). Read the files named below before editing. Keep the existing architecture:
server events through `apps/server/src/services/events.ts`, status changes through `apps/server/src/services/lifecycle.ts`,
app API calls through `frontend/src/services/api.js`, live subscriptions with `useRealtime` from `frontend/src/services/realtime.js`.
Expo SDK 58: check https://docs.expo.dev/versions/v58.0.0/sdk/location/ before using `expo-location`; install packages only with `npx expo install`.

## Current problems (verified in the code)
1. Farmer is **never asked for location**. `frontend/src/services/bookings.js → getDefaultAddressId()` creates the delivery address without coordinates, so the server falls back to a fixed point (15.3647, 75.124). Delivery distance/ETA is therefore wrong.
2. `frontend/src/context/LocationContext.js → detectGpsLocation()` is **fake**: it waits 800 ms and returns hard-coded "Navalgund".
3. `frontend/src/screens/DeliveryScreen.js`: phone GPS is **off by default** (`useGps` false → simulated route). Permission is requested only when the driver flips the switch. Tracking stops when the app goes to background or the screen turns off.
4. Farmer and admin see only text ("x km away · ETA y min"); there is **no map**.

## Required changes

### 1. Farmer location — ask and use real GPS
- Add `frontend/src/services/location.js` with `requestAndGetLocation()`:
  - `Location.requestForegroundPermissionsAsync()` with a clear explanation screen/dialog first ("We need your farm location to deliver to your field").
  - If GPS is off, prompt to turn it on (`Location.enableNetworkProviderAsync()` on Android) and retry.
  - `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })`, then `Location.reverseGeocodeAsync` → village/district/state/pincode.
  - Handle "denied" and "denied permanently" (show a button to open settings with `Linking.openSettings()`).
- `LocationContext.detectGpsLocation()` uses this real function (remove the hard-coded Navalgund). Store lat/lng in context and AsyncStorage.
- **Checkout and machine booking** (`CartScreen.js`, `BookingModal.js`, `bookings.js`):
  - Before placing the order, show a "Delivery location" card with the address + a small map pin and two buttons: "Use my current location" (calls `requestAndGetLocation`) and "Change" (lets the farmer drag a pin on the map — see section 3).
  - If the farmer has no saved address with real coordinates, ask for location permission automatically when they open checkout.
  - Send real `latitude`/`longitude` to `POST /api/v1/addresses` (server already accepts them) and use that address for the order/rental. Allow updating an address: add `PUT /api/v1/addresses/:id` on the server (in `opsController.ts`, owner-only check).
  - Server: when an order/rental is created, the `DeliveryJob.dropoffLat/Lng` must come from this address (already does) — reject addresses without coordinates in production (`DEMO_MODE=false`).

### 2. Driver location — real GPS by default, also in background
- In `DeliveryScreen.js`, ask for location permission **as soon as the driver logs in** (explain why). Phone GPS is the default; keep the simulated route only when `DEMO_MODE` is true and as an explicit "Demo route" option.
- Use `Location.watchPositionAsync({ accuracy: High, timeInterval: 5000, distanceInterval: 20 })` while a job is `STARTED` or `ARRIVED`; send pings with `api.sendDriverLocation(jobId, lat, lng, speed, heading)` (include heading and accuracy).
- **Background tracking** with `expo-task-manager` + `Location.startLocationUpdatesAsync` and an Android foreground-service notification ("Kisan Kendra is sharing your location for delivery ORD-…"). Request background permission (`requestBackgroundPermissionsAsync`) only after foreground is granted, with an explanation. Configure via the `expo-location` config plugin in `frontend/app.json`: `isAndroidBackgroundLocationEnabled: true`, `isAndroidForegroundServiceEnabled: true`, plus `locationAlwaysAndWhenInUsePermission` text. Stop updates when the job is delivered/cancelled or the driver goes offline.
- Batch pings while offline and send when back online (the server endpoint already accepts an array of pings).
- Show the driver a "GPS: active / weak signal / permission missing" indicator.

### 3. Live map for farmer, admin and driver
- Use `react-native-webview` (install with `npx expo install react-native-webview`) to render a **Leaflet + OpenStreetMap** map (no Google API key needed). Create one reusable component `frontend/src/components/LiveMap.js`:
  - Props: `driver {lat,lng,heading}`, `destination {lat,lng}`, `pickup {lat,lng}`, optional `draggablePin`.
  - Load Leaflet from a CDN inside the WebView HTML; update the driver marker via `webViewRef.injectJavaScript` (smoothly animate between points) without reloading the map.
  - Draw a line from driver to destination and fit bounds.
- **Farmer – Orders screen**: when an order is `OUT_FOR_DELIVERY` (or rental `DISPATCHED`/`NEAR_FARM`), show the LiveMap with the moving driver, plus distance, ETA and "last updated x s ago". It updates from the existing `location:update` socket event. On first load, fetch the last position from `GET /api/v1/tracking/:jobId` (exists) so the map isn't empty.
- **Driver**: map with route to the farm and a "Navigate" button (Google Maps intent, already present).
- **Admin (in-app admin screen and web `/admin` Fleet tab)**: map with all active drivers, updated live from `location:update`.
- Do **not** use `react-native-maps` (it needs a Google API key and previously risked startup crashes).

### 4. Server
- `trackingController.submitDriverLocation`: accept heading/accuracy; keep the speed-jump check; include `orderId/rentalId`, `distanceKmRemaining`, `etaMinutes` in the `location:update` payload (already) and also emit to the order's farmer via `emitToUser` (already) — verify it works without Redis.
- Auto "Near farm" status: when the driver is within 500 m of the destination, call `setRentalStatus(..., 'NEAR_FARM')` for rentals and send the farmer a notification "Your delivery is 500 m away" (once per job).
- `GET /api/v1/tracking/:jobId` must return the latest ping from memory/DB for the farmer, assigned driver, owner and admin.

### 5. Permissions & privacy
- `frontend/app.json` → `expo-location` plugin texts:
  - when-in-use: "Kisan Kendra uses your location to deliver orders and machines to your farm and to show delivery tracking."
  - always (drivers): "Kisan Kendra shares your location during active deliveries so farmers can track their order."
- Remove unused scary permissions (`android.permission.SYSTEM_ALERT_WINDOW`) via `android.blockedPermissions` in `app.json`.
- Farmers' location is only shared with the assigned driver/owner/admin; drivers' location is only shared during an active job.

## Checks (must pass before finishing)
1. `cd apps/server && npx tsc --noEmit` and `npm test`.
2. `cd frontend && npx expo export --platform web --output-dir dist` succeeds (guard WebView/background-location code for web with `Platform.OS`).
3. Bump `frontend/app.json` `version` and `android.versionCode`, then `npx expo prebuild --platform android` (must regenerate `android/app/build.gradle` with the new versionCode), keep `android.enableMinifyInReleaseBuilds=false`, `cd android && ./gradlew assembleRelease`.
4. Test with **two phones** (or a phone + emulator using mock locations):
   - Farmer opens checkout → app **asks for location** → address shows real village + pin → order placed.
   - Admin confirms + packs → driver app **asks for location** (foreground + background) → driver starts trip.
   - Farmer's Orders screen shows the map with the driver marker moving as the driver walks/drives; distance and ETA change; "Near farm" notification at 500 m.
   - Lock the driver's phone screen for 1 minute → the farmer still sees updates.
   - Deny permission → app explains and offers "Open settings"; nothing crashes.
5. Commit, `git push origin HEAD:main` (Render redeploys), wait until `https://farmer-app-klid.onrender.com/ready` is ready, copy the APK to the project root as `KisanKendra-v<version>.apk`, and report: what changed, commit hashes, APK name/version, and test results.
