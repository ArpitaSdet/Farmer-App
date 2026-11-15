import React, { createContext, useContext, useState } from 'react';

const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState({
    village: 'Unkal Village',
    taluk: 'Hubballi',
    district: 'Dharwad',
    state: 'Karnataka',
    pincode: '580031',
    gpsEnabled: false,
  });

  const [isLocating, setIsLocating] = useState(false);

  const updateLocation = (newLoc) => {
    setLocation((prev) => ({ ...prev, ...newLoc }));
  };

  const detectGpsLocation = async () => {
    setIsLocating(true);
    // Simulate GPS acquisition with realistic farmer hub
    await new Promise((resolve) => setTimeout(resolve, 800));
    setLocation({
      village: 'Navalgund Farm Road',
      taluk: 'Navalgund',
      district: 'Dharwad',
      state: 'Karnataka',
      pincode: '582208',
      gpsEnabled: true,
    });
    setIsLocating(false);
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
