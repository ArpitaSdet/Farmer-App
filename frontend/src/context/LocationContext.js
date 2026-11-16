import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestAndGetLocation } from '../services/location';

const STORAGE_KEY = 'kk_farmer_location_v2';
const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState({
    village: 'Unkal Village',
    taluk: 'Hubballi',
    district: 'Dharwad',
    state: 'Karnataka',
    pincode: '580031',
    latitude: 15.3647,
    longitude: 75.124,
    gpsEnabled: false,
  });

  const [isLocating, setIsLocating] = useState(false);

  // Load saved location on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.latitude && parsed.longitude) {
            setLocation((prev) => ({ ...prev, ...parsed }));
          }
        } catch (_) {}
      }
    });
  }, []);

  const updateLocation = (newLoc) => {
    setLocation((prev) => {
      const merged = { ...prev, ...newLoc };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged)).catch(() => {});
      return merged;
    });
  };

  /**
   * Real GPS location detection: asks permission, checks network provider,
   * reverse-geocodes village/district, and saves to state & AsyncStorage.
   */
  const detectGpsLocation = async () => {
    setIsLocating(true);
    try {
      const realLoc = await requestAndGetLocation();
      if (realLoc && realLoc.latitude && realLoc.longitude) {
        const updated = {
          village: realLoc.village,
          taluk: realLoc.taluk,
          district: realLoc.district,
          state: realLoc.state,
          pincode: realLoc.pincode,
          latitude: realLoc.latitude,
          longitude: realLoc.longitude,
          gpsEnabled: true,
          formattedAddress: realLoc.formattedAddress,
        };
        setLocation(updated);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      }
    } catch (e) {
      console.warn('detectGpsLocation error:', e);
    } finally {
      setIsLocating(false);
    }
    return null;
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        updateLocation,
        detectGpsLocation,
        isLocating,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
