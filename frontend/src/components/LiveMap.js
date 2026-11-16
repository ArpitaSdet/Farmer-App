import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';

let WebView = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    WebView = null;
  }
}

/**
 * Reusable Leaflet + OpenStreetMap map component.
 * Props:
 * - driver: { lat, lng, heading }
 * - destination: { lat, lng }
 * - pickup: { lat, lng }
 * - markers: [ { lat, lng, label, color, id } ] (e.g. For admin fleet view)
 * - draggablePin: { lat, lng, onDragEnd: (coords) => void }
 * - height: number
 */
export const LiveMap = ({
  driver,
  destination,
  pickup,
  markers = [],
  draggablePin,
  onPinChange,
  style,
  height = 240,
}) => {
  const webViewRef = useRef(null);

  // Default center: Dharwad / Hubballi region
  const initialLat = driver?.lat || destination?.lat || draggablePin?.lat || 15.3647;
  const initialLng = driver?.lng || destination?.lng || draggablePin?.lng || 75.124;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #e0e0e0; }
    .driver-icon { font-size: 24px; text-align: center; line-height: 24px; transition: transform 0.8s ease-out; }
    .dest-icon { font-size: 26px; text-align: center; }
    .pickup-icon { font-size: 22px; text-align: center; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([${initialLat}, ${initialLng}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    var driverMarker = null;
    var destMarker = null;
    var pickupMarker = null;
    var routeLine = null;
    var dragMarker = null;
    var fleetMarkers = {};

    function updateDriver(lat, lng, heading) {
      if (!lat || !lng) return;
      if (!driverMarker) {
        var icon = L.divIcon({ className: 'driver-icon', html: '🚚', iconSize: [30, 30], iconAnchor: [15, 15] });
        driverMarker = L.marker([lat, lng], { icon: icon }).addTo(map);
      } else {
        driverMarker.setLatLng([lat, lng]);
      }
      updateRoute();
    }

    function updateDestination(lat, lng) {
      if (!lat || !lng) return;
      if (!destMarker) {
        var icon = L.divIcon({ className: 'dest-icon', html: '📍', iconSize: [30, 30], iconAnchor: [15, 28] });
        destMarker = L.marker([lat, lng], { icon: icon }).addTo(map);
      } else {
        destMarker.setLatLng([lat, lng]);
      }
      updateRoute();
    }

    function updatePickup(lat, lng) {
      if (!lat || !lng) return;
      if (!pickupMarker) {
        var icon = L.divIcon({ className: 'pickup-icon', html: '🏬', iconSize: [26, 26], iconAnchor: [13, 13] });
        pickupMarker = L.marker([lat, lng], { icon: icon }).addTo(map);
      } else {
        pickupMarker.setLatLng([lat, lng]);
      }
    }

    function updateRoute() {
      var pts = [];
      if (driverMarker) pts.push(driverMarker.getLatLng());
      else if (pickupMarker) pts.push(pickupMarker.getLatLng());
      if (destMarker) pts.push(destMarker.getLatLng());

      if (pts.length >= 2) {
        if (!routeLine) {
          routeLine = L.polyline(pts, { color: '#1B5E20', weight: 4, dashArray: '6, 8', opacity: 0.85 }).addTo(map);
        } else {
          routeLine.setLatLngs(pts);
        }
        try {
          map.fitBounds(L.latLngBounds(pts), { padding: [35, 35], maxZoom: 16 });
        } catch(e) {}
      }
    }

    function setupDraggablePin(lat, lng) {
      if (!lat || !lng) return;
      var icon = L.divIcon({ className: 'dest-icon', html: '📍', iconSize: [32, 32], iconAnchor: [16, 30] });
      dragMarker = L.marker([lat, lng], { icon: icon, draggable: true }).addTo(map);
      dragMarker.on('dragend', function(e) {
        var pos = e.target.getLatLng();
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PIN_DRAGGED', lat: pos.lat, lng: pos.lng }));
        }
      });
      map.setView([lat, lng], 15);
    }

    ${driver ? `updateDriver(${driver.lat}, ${driver.lng}, ${driver.heading || 0});` : ''}
    ${destination ? `updateDestination(${destination.lat}, ${destination.lng});` : ''}
    ${pickup ? `updatePickup(${pickup.lat}, ${pickup.lng});` : ''}
    ${draggablePin ? `setupDraggablePin(${draggablePin.lat}, ${draggablePin.lng});` : ''}
    ${
      markers && markers.length
        ? markers
            .map(
              (m) =>
                `L.marker([${m.lat}, ${m.lng}], { title: "${m.label || ''}" }).addTo(map).bindPopup("<b>${m.label || 'Driver'}</b>");`
            )
            .join('\n')
        : ''
    }
  </script>
</body>
</html>
  `;

  // Live injection when driver moves
  useEffect(() => {
    if (webViewRef.current && driver?.lat && driver?.lng) {
      const js = `if (typeof updateDriver === 'function') { updateDriver(${driver.lat}, ${driver.lng}, ${driver.heading || 0}); } true;`;
      webViewRef.current.injectJavaScript(js);
    }
  }, [driver?.lat, driver?.lng, driver?.heading]);

  // Handle messages from WebView (e.g. PIN_DRAGGED)
  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PIN_DRAGGED') {
        if (onPinChange) onPinChange({ lat: data.lat, lng: data.lng });
        if (draggablePin?.onDragEnd) draggablePin.onDragEnd({ lat: data.lat, lng: data.lng });
      }
    } catch (_) {}
  };

  if (Platform.OS === 'web' || !WebView) {
    // Web rendering fallback via standard iframe or Leaflet
    return (
      <View style={[styles.container, { height }, style]}>
        <iframe
          srcDoc={htmlContent}
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
          title="Leaflet Map"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        onMessage={onMessage}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color="#1B5E20" />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ECEFF1',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECEFF1',
  },
});
