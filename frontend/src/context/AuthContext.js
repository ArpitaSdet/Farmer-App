import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { connectRealtime, disconnectRealtime } from '../services/realtime';

const SESSION_KEY = 'kk_session';
const AuthContext = createContext();

const toUiUser = (u, role) => ({
  ...u,
  role: role || u.role,
  mobileNumber: u.phone,
  mainCrops: typeof u.mainCrops === 'string' ? u.mainCrops.split(',').filter(Boolean) : u.mainCrops || [],
  farmSize: u.landSizeAcres ? `${u.landSizeAcres} Acres` : '',
  preferredLanguage: u.preferredLang,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    api.setToken(null);
    disconnectRealtime();
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
    } catch (_) {}
  }, []);

  const startSession = useCallback(async (accessToken, rawUser, role) => {
    const uiUser = toUiUser(rawUser, role);
    api.setToken(accessToken);
    setToken(accessToken);
    setUser(uiUser);
    connectRealtime(accessToken);
    try {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ token: accessToken, user: uiUser }));
    } catch (_) {}
  }, []);

  // Restore a saved session on launch
  useEffect(() => {
    api.onUnauthorized = () => logout();
    (async () => {
      await api.init();
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          api.setToken(saved.token);
          const me = await api.getProfile();
          await startSession(saved.token, me, saved.user.role);
        }
      } catch (_) {
        await logout();
      } finally {
        setBooting(false);
      }
    })();
  }, [logout, startSession]);

  /**
   * Verify the OTP. Returns { done: true } on login, or { roles, tempToken } when the
   * number has several approved profiles (e.g. farmer + machine owner) to choose from.
   */
  const loginWithOtp = async (mobileNumber, otp, role) => {
    setLoading(true);
    try {
      const data = await api.verifyOtp({ mobileNumber, otp, role });
      if (data.requiresProfileSelection) {
        return { roles: data.availableRoles, tempToken: data.tempToken };
      }
      if (data.kycPending) {
        throw new Error(data.message);
      }
      await startSession(data.tokens.accessToken, data.user, data.user.role);
      return { done: true };
    } finally {
      setLoading(false);
    }
  };

  const chooseProfile = async (tempToken, role) => {
    setLoading(true);
    try {
      const data = await api.selectProfile(tempToken, role);
      await startSession(data.tokens.accessToken, data.user, role);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    const me = await api.getProfile();
    await startSession(token, me, user?.role);
  };

  const role = user?.role;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        booting,
        loading,
        loginWithOtp,
        chooseProfile,
        refreshProfile,
        logout,
        isFarmer: role === 'FARMER',
        isDriver: role === 'DRIVER',
        isOwner: role === 'OWNER',
        isAdmin: role === 'ADMIN',
        activeThemeColor: role === 'OWNER' ? '#E65100' : role === 'DRIVER' ? '#1565C0' : '#1B5E20',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
