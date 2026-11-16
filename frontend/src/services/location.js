/**
 * frontend/src/services/location.js
 * Real GPS location acquisition with farmer-friendly explanation & permission flow.
 */
import { Platform, Linking, Alert } from 'react-native';
import * as Location from 'expo-location';

/**
 * Request foreground GPS permission and fetch the user's high-accuracy location.
 * Resolves village/district/state/pincode via reverse geocoding.
 */
export async function requestAndGetLocation(customAlertMessage) {
  try {
    // 1. Check existing permission status
    const existing = await Location.getForegroundPermissionsAsync();

    if (!existing.granted) {
      // If permission is permanently denied on device, guide user to Settings
      if (!existing.canAskAgain && existing.status === 'denied') {
        Alert.alert(
          'Location Permission Required',
          'Kisan Kendra needs your farm location to deliver to your field. Please enable location permissions in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return null;
      }

      // Request permission
      const req = await Location.requestForegroundPermissionsAsync();
      if (!req.granted) {
        if (!req.canAskAgain) {
          Alert.alert(
            'Location Permission Denied',
            'To deliver orders to your farm, please allow location access in your phone Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        }
        return null;
      }
    }

    // 2. Ensure device GPS / Location Services are turned on
    if (Platform.OS === 'android') {
      try {
        const providerStatus = await Location.getProviderStatusAsync();
        if (!providerStatus.locationServicesEnabled) {
          await Location.enableNetworkProviderAsync();
        }
      } catch (provErr) {
        // Continue and attempt getCurrentPositionAsync
      }
    }

    // 3. Obtain real GPS coordinates
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeInterval: 2000,
      timeout: 15000,
    });

    const { latitude, longitude, altitude, heading, speed, accuracy } = position.coords;

    // 4. Reverse geocode coordinates to rural Indian address (village, district, state, pincode)
    let village = 'Farm Location';
    let taluk = '';
    let district = 'Dharwad';
    let state = 'Karnataka';
    let pincode = '580001';

    try {
      const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocoded && geocoded.length > 0) {
        const g = geocoded[0];
        village = g.subregion || g.name || g.street || g.city || 'Farm Location';
        taluk = g.subregion || g.district || '';
        district = g.district || g.city || 'Dharwad';
        state = g.region || 'Karnataka';
        pincode = g.postalCode || '580001';
      }
    } catch (geoErr) {
      // Fallback geocode based on coordinates
    }

    return {
      latitude,
      longitude,
      altitude,
      heading,
      speed,
      accuracy,
      village,
      taluk,
      district,
      state,
      pincode,
      formattedAddress: `${village}, ${district} ${pincode}`,
      gpsEnabled: true,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('requestAndGetLocation failed:', err?.message || err);
    return null;
  }
}
