import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTranslation, supportedLanguages } from '../localization/i18n';
import { api } from '../services/api';

const LANG_KEY = 'kk_user_lang';
const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // Default to English ('en') as safe baseline, updated from storage or user profile
  const [currentLanguage, setCurrentLanguageState] = useState('en');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANG_KEY);
        if (saved) {
          setCurrentLanguageState(saved);
        }
      } catch (_) {}
    })();
  }, []);

  const setLanguage = async (lang) => {
    setCurrentLanguageState(lang);
    try {
      await AsyncStorage.setItem(LANG_KEY, lang);
      // Best-effort sync with server profile
      if (api.token) {
        api.updateProfile({ preferredLanguage: lang }).catch(() => {});
      }
    } catch (_) {}
  };

  const t = (key) => getTranslation(currentLanguage, key);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        supportedLanguages,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
