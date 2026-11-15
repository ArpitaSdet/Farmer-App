import en from './translations/en.json';
import kn from './translations/kn.json';
import hi from './translations/hi.json';
import mr from './translations/mr.json';
import te from './translations/te.json';
import ta from './translations/ta.json';

const translations = { en, kn, hi, mr, te, ta };

export const supportedLanguages = [
  { code: 'kn', label: 'ಕನ್ನಡ', nativeName: 'ಕನ್ನಡ', region: 'Karnataka' },
  { code: 'hi', label: 'हिन्दी', nativeName: 'हिन्दी', region: 'North / Central India' },
  { code: 'mr', label: 'मराठी', nativeName: 'मराठी', region: 'Maharashtra' },
  { code: 'te', label: 'తెలుగు', nativeName: 'తెలుగు', region: 'Andhra & Telangana' },
  { code: 'ta', label: 'தமிழ்', nativeName: 'தமிழ்', region: 'Tamil Nadu' },
  { code: 'en', label: 'English', nativeName: 'English', region: 'All India' },
];

export const getTranslation = (langCode, key) => {
  const activeDict = translations[langCode] || translations.en;
  if (activeDict && activeDict[key]) {
    return activeDict[key];
  }
  // Fallback to English
  return translations.en[key] || key;
};
