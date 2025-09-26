'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '../../../public/locales/en/common.json';
import enDashboard from '../../../public/locales/en/dashboard.json';
import hiCommon from '../../../public/locales/hi/common.json';
import hiDashboard from '../../../public/locales/hi/dashboard.json';
import mrCommon from '../../../public/locales/mr/common.json';
import mrDashboard from '../../../public/locales/mr/dashboard.json';

const resources = {
  en: {
    common: enCommon,
    dashboard: enDashboard,
  },
  hi: {
    common: hiCommon,
    dashboard: hiDashboard,
  },
  mr: {
    common: mrCommon,
    dashboard: mrDashboard,
  },
};

// Initialize i18n only if not already initialized
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      lng: 'en', // default language
      fallbackLng: 'en',
      debug: process.env.NODE_ENV === 'development',

      interpolation: {
        escapeValue: false, // not needed for react as it escapes by default
      },

      detection: {
        order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
        caches: ['localStorage', 'cookie'],
      },

      react: {
        useSuspense: false,
      },

      // Add namespace configuration
      ns: ['common', 'dashboard'],
      defaultNS: 'common',
    });
}

export default i18n;