import React, { createContext, useContext, useState } from 'react';
import { getTranslation, supportedLanguages } from '../localization/i18n';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // Default to Kannada ('kn') or English ('en')
  const [currentLanguage, setCurrentLanguage] = useState('kn');

  const t = (key) => getTranslation(currentLanguage, key);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage: setCurrentLanguage,
        supportedLanguages,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
