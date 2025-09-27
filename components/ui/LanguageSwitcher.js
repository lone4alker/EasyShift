'use client';

import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    if (i18n && i18n.isInitialized) {
      setIsReady(true);
    }
  }, [i18n]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right + window.scrollX
      });
    }
  }, [isOpen]);

  const currentLanguage = languages.find(lang => lang.code === (i18n?.language || 'en')) || languages[0];

  const changeLanguage = (langCode) => {
    if (i18n && i18n.changeLanguage) {
      i18n.changeLanguage(langCode);
      setIsOpen(false);
    }
  };

  if (!isReady) {
    return (
      <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse"></div>
    );
  }

  const DropdownContent = () => (
    <>
      {/* Dropdown Menu */}
      <div 
        className="fixed w-52 sm:w-48 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
        style={{ 
          top: dropdownPosition.top,
          right: dropdownPosition.right,
          zIndex: 9999
        }}
      >
        <div className="py-1">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => changeLanguage(language.code)}
              className={`btn-responsive w-full flex items-center space-x-3 px-4 py-4 sm:py-3 text-sm hover:bg-blue-50 transition-colors duration-200 min-h-[44px] ${
                i18n.language === language.code 
                  ? 'bg-blue-100 text-blue-700 font-medium' 
                  : 'text-slate-700 hover:text-blue-600'
              }`}
            >
              <span className="text-xl sm:text-lg">{language.flag}</span>
              <span className="text-base sm:text-sm">{language.name}</span>
              {i18n.language === language.code && (
                <svg className="w-5 h-5 sm:w-4 sm:h-4 ml-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Overlay to close dropdown */}
      <div 
        className="fixed inset-0 bg-transparent"
        style={{ zIndex: 9998 }}
        onClick={() => setIsOpen(false)}
      />
    </>
  );

  return (
    <div className="relative">
      {/* Language Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="btn-responsive flex items-center space-x-1 sm:space-x-2 px-3 py-3 sm:py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 border border-slate-200 hover:border-blue-300 min-h-[44px] min-w-[44px]"
      >
        <span className="text-lg sm:text-base">{currentLanguage.flag}</span>
        <span className="hidden sm:block">{currentLanguage.name}</span>
        <svg 
          className={`w-5 h-5 sm:w-4 sm:h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Portal for dropdown */}
      {isOpen && typeof window !== 'undefined' && createPortal(
        <DropdownContent />,
        document.body
      )}
    </div>
  );
}