'use client';

import { useTranslation } from 'react-i18next';

// Custom hook for translations with namespace support
export function useT(namespace = 'common') {
  const { t, i18n } = useTranslation(namespace);
  return { t, i18n, currentLanguage: i18n.language };
}

// Utility function to format time ago
export function formatTimeAgo(t, hoursAgo) {
  if (hoursAgo < 1) {
    return t('dashboard:recentActivity.timeAgo.justNow', 'Just now');
  } else if (hoursAgo < 24) {
    return t('dashboard:recentActivity.timeAgo.hoursAgo', { count: Math.floor(hoursAgo) });
  } else {
    return t('dashboard:recentActivity.timeAgo.yesterday');
  }
}

// Utility function to format currency based on locale
export function formatCurrency(amount, currency = 'INR', locale = 'en-IN') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Utility function to format numbers with locale-specific separators
export function formatNumber(number, locale = 'en-IN') {
  return new Intl.NumberFormat(locale).format(number);
}

// Utility function to get time format based on locale
export function formatTime(date = new Date(), locale = 'en-US') {
  return date.toLocaleTimeString(locale, { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  });
}