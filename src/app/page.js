'use client';

import Link from 'next/link';
import { useT } from '@/app/utils/translations';
import LanguageSwitcher from '../../components/ui/LanguageSwitcher';

export default function LandingPage() {
  const { t } = useT();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-inter">
      {/* Header */}
      <header className="border-b border-white/20 bg-white/90 backdrop-blur-xl shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4 group">
              <div className="relative">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-blue-500/25 transition-all duration-300 group-hover:rotate-3">
                  <svg className="h-4 w-4 sm:h-6 sm:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <span className="text-lg sm:text-2xl font-black bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent tracking-tight">{t('appName')}</span>
                <div className="text-xs text-blue-600 font-medium -mt-1 hidden sm:block">{t('landing.header.aiScheduling')}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>
              <Link href="/owner/login">
                <button className="group px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-slate-50 to-blue-50 border-2 border-blue-200/50 rounded-xl sm:rounded-2xl text-slate-700 hover:text-blue-700 hover:border-blue-300 transition-all duration-300 cursor-pointer font-semibold tracking-wide shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                  <span className="flex items-center space-x-1 sm:space-x-2">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-xs sm:text-sm">{t('landing.header.ownerPortal')}</span>
                  </span>
                </button>
              </Link>
              <Link href="/staff/login">
                <button className="group px-3 sm:px-5 py-2 sm:py-3 text-slate-600 hover:text-blue-600 transition-all duration-300 cursor-pointer font-semibold tracking-wide hover:bg-blue-50/80 rounded-xl sm:rounded-2xl">
                  <span className="flex items-center space-x-1 sm:space-x-2">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-xs sm:text-sm hidden sm:inline">{t('landing.header.staffLogin')}</span>
                    <span className="text-xs sm:text-sm sm:hidden">Staff</span>
                  </span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Breadcrumb Bar */}
      <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-purple-50/80 backdrop-blur-sm border-b border-slate-200/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5"></div>
        <div className="container mx-auto px-6 py-3 relative">
          <div className="flex items-center justify-between">
            {/* Current Location */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-slate-700">{t('landing.breadcrumb.browsing')}</span>
                <span className="text-sm font-semibold text-blue-700 bg-blue-100/50 px-3 py-1 rounded-full">
                  {t('landing.breadcrumb.homePage')}
                </span>
              </div>
            </div>

            {/* Quick Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-xs text-slate-600">
                <span>{t('landing.breadcrumb.quickAccess')}</span>
                <Link 
                  href="/owner/login" 
                  className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 group"
                >
                  <svg className="w-3 h-3 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>{t('landing.breadcrumb.owner')}</span>
                </Link>
                <span className="text-slate-400">•</span>
                <Link 
                  href="/staff/login" 
                  className="inline-flex items-center space-x-1 text-emerald-600 hover:text-emerald-800 font-medium transition-colors duration-200 group"
                >
                  <svg className="w-3 h-3 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>{t('landing.breadcrumb.staff')}</span>
                </Link>
                <span className="text-slate-400">•</span>
                <button className="inline-flex items-center space-x-1 text-purple-600 hover:text-purple-800 font-medium transition-colors duration-200 group">
                  <svg className="w-3 h-3 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t('landing.breadcrumb.help')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-16 sm:pb-30">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/5 via-transparent to-indigo-600/5"></div>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgb(59 130 246 / 0.1)" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="absolute top-20 left-10 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/2 w-48 h-48 sm:w-64 sm:h-64 bg-gradient-to-r from-emerald-400/15 to-blue-400/15 rounded-full mix-blend-multiply filter blur-2xl opacity-60 animate-pulse delay-500"></div>
        
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
              <div className="space-y-6 sm:space-y-7 text-center lg:text-left">
                <div className="space-y-4 sm:space-y-5">
                  <div className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-100/90 to-indigo-100/90 border border-blue-200/50 rounded-full text-blue-700 text-xs sm:text-sm font-bold tracking-wide backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 group cursor-default">
                    <span className="mr-2 group-hover:rotate-12 transition-transform duration-300">🚀</span>
                    <span>{t('landing.hero.badge')}</span>
                    <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold leading-tight tracking-tight">
                    <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">{t('landing.hero.title1')}</span>
                    <br />
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">{t('landing.hero.title2')}</span>
                    <br />
                    <span className="text-slate-800">{t('landing.hero.title3')}</span>
                  </h1>
                  <p className="text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed font-medium max-w-2xl mx-auto lg:mx-0">
                    {t('landing.hero.description')}
                    <span className="text-blue-600 font-semibold">{t('landing.hero.fairCoverage')}</span>
                    {t('landing.hero.descriptionEnd')}
                  </p>
                </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-center lg:justify-start">
                <Link href="/setup">
                  <button className="group w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 flex items-center justify-center cursor-pointer shadow-xl hover:shadow-blue-500/25 transform hover:-translate-y-1 min-h-[48px]">
                    {t('landing.hero.startFreeSetup')}
                    <svg className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
                <button className="group w-full sm:w-auto border-2 border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl text-sm sm:text-base font-semibold hover:bg-blue-50/50 transition-all duration-300 cursor-pointer backdrop-blur-sm min-h-[48px]">
                  <span className="flex items-center justify-center">
                    {t('landing.hero.watchDemo')}
                    <svg className="ml-2 h-4 w-4 group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </span>
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-3 gap-4 sm:flex sm:items-center sm:space-x-6 pt-4 sm:pt-6 justify-center lg:justify-start">
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-slate-800">500+</div>
                  <div className="text-xs text-slate-600 font-medium">{t('landing.hero.trustIndicators.businesses')}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-slate-800">10K+</div>
                  <div className="text-xs text-slate-600 font-medium">{t('landing.hero.trustIndicators.shifts')}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-slate-800">98%</div>
                  <div className="text-xs text-slate-600 font-medium">{t('landing.hero.trustIndicators.satisfaction')}</div>
                </div>
              </div>
            </div>
            
            <div className="relative mt-8 lg:mt-0">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl sm:rounded-3xl blur-3xl"></div>
              <div className="relative bg-gradient-to-br from-white to-blue-50/50 rounded-2xl sm:rounded-3xl shadow-2xl border border-blue-100/50 backdrop-blur-xl p-4 sm:p-8">
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800">{t('landing.hero.schedule.weeklySchedule')}</h3>
                    <span className="text-xs sm:text-sm text-green-600 font-semibold bg-green-100 px-2 sm:px-3 py-1 rounded-full self-start">{t('landing.hero.schedule.aiOptimized')}</span>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    {['Monday', 'Tuesday', 'Wednesday'].map((day, i) => (
                      <div key={day} className="flex items-center justify-between p-3 sm:p-4 bg-white/80 rounded-lg sm:rounded-xl border border-slate-100 backdrop-blur-sm">
                        <div>
                          <div className="font-semibold text-slate-800 text-sm sm:text-base">{day}</div>
                          <div className="text-xs sm:text-sm text-slate-600">9:00 AM - 5:00 PM</div>
                        </div>
                        <div className="flex -space-x-1 sm:-space-x-2">
                          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white ${i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-green-500' : 'bg-purple-500'}`}></div>
                          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white ${i === 0 ? 'bg-green-500' : i === 1 ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-white relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-white"></div>
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full text-blue-700 text-xs font-semibold tracking-wide mb-4">
              {t('landing.features.badge')}
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-4 leading-tight">
              <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">{t('landing.features.title1')}</span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{t('landing.features.title2')}</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              {t('landing.features.description')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="group bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/30 rounded-2xl sm:rounded-3xl shadow-2xl border border-blue-100/60 p-6 sm:p-8 hover:shadow-3xl hover:shadow-blue-500/20 transition-all duration-700 transform hover:-translate-y-3 hover:rotate-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="mb-4 sm:mb-6">
                  <div className="relative">
                    <div className="w-14 h-14 sm:w-18 sm:h-18 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                      <svg className="h-6 w-6 sm:h-8 sm:w-8 text-white group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full border-2 border-white group-hover:scale-125 transition-transform duration-300"></div>
                  </div>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-3 text-slate-800 group-hover:text-blue-600 transition-colors duration-300">{t('landing.features.aiSchedules.title')}</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                {t('landing.features.aiSchedules.description')}
              </p>
            </div>

            <div className="group bg-gradient-to-br from-white to-green-50/30 rounded-2xl sm:rounded-3xl shadow-xl border border-green-100/50 p-6 sm:p-8 hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-500 transform hover:-translate-y-2">
              <div className="mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-6 w-6 sm:h-8 sm:w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-3 text-slate-800 group-hover:text-green-600 transition-colors duration-300">{t('landing.features.fairRotation.title')}</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                {t('landing.features.fairRotation.description')}
              </p>
            </div>

            <div className="group bg-gradient-to-br from-white to-purple-50/30 rounded-2xl sm:rounded-3xl shadow-xl border border-purple-100/50 p-6 sm:p-8 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 transform hover:-translate-y-2">
              <div className="mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-6 w-6 sm:h-7 sm:w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-3 text-slate-800 group-hover:text-purple-600 transition-colors duration-300">{t('landing.features.mobilePortal.title')}</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                {t('landing.features.mobilePortal.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-slate-50 to-blue-50/30 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-indigo-400/10 rounded-full mix-blend-multiply filter blur-3xl"></div>
        
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-100 to-blue-100 rounded-full text-green-700 text-xs font-semibold tracking-wide mb-4">
              {t('landing.howItWorks.badge')}
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-4 leading-tight">
              <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">{t('landing.howItWorks.title1')}</span>
              <br />
              <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">{t('landing.howItWorks.title2')}</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              {t('landing.howItWorks.description')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            <div className="text-center group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-2xl sm:rounded-3xl transform scale-0 group-hover:scale-100 transition-transform duration-500 -z-10"></div>
              <div className="relative mb-6 sm:mb-10 p-4 sm:p-6">
                <div className="relative">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent"></div>
                    <span className="text-2xl sm:text-4xl font-black text-white relative z-10">1</span>
                  </div>
                  <div className="absolute -top-2 sm:-top-3 -right-2 sm:-right-3 w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 sm:border-4 border-white group-hover:scale-125 transition-transform duration-300 flex items-center justify-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-3 text-slate-800 group-hover:text-blue-600 transition-colors duration-300">{t('landing.howItWorks.step1.title')}</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                {t('landing.howItWorks.step1.description')}
              </p>
              <div className="mt-4 sm:mt-6 flex justify-center">
                <svg className="w-8 h-1 text-blue-300" viewBox="0 0 100 10" fill="currentColor">
                  <rect width="100" height="10" rx="5"/>
                </svg>
              </div>
            </div>
            
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-green-500/25 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl font-black text-white">2</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full border-4 border-white"></div>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-slate-800 group-hover:text-green-600 transition-colors duration-300">{t('landing.howItWorks.step2.title')}</h3>
              <p className="text-slate-600 leading-relaxed font-medium text-lg">
                {t('landing.howItWorks.step2.description')}
              </p>
              <div className="mt-6 flex justify-center">
                <svg className="w-8 h-1 text-green-300" viewBox="0 0 100 10" fill="currentColor">
                  <rect width="100" height="10" rx="5"/>
                </svg>
              </div>
            </div>
            
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-purple-500/25 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl font-black text-white">3</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full border-4 border-white animate-pulse"></div>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-slate-800 group-hover:text-purple-600 transition-colors duration-300">{t('landing.howItWorks.step3.title')}</h3>
              <p className="text-slate-600 leading-relaxed font-medium text-lg">
                {t('landing.howItWorks.step3.description')}
              </p>
              <div className="mt-6">
                <div className="inline-flex items-center px-4 py-2 bg-purple-100 rounded-full text-purple-700 text-sm font-semibold">
                  {t('landing.howItWorks.step3.badge')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

   
      {/* Footer */}
      <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-indigo-900/20"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
            {/* Brand Section */}
            <div className="md:col-span-2 lg:col-span-2 space-y-4 sm:space-y-6">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <svg className="h-8 w-8 sm:h-10 sm:w-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full"></div>
                </div>
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">ShiftEasy</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-sm sm:text-base max-w-md">
                {t('landing.footer.description')}
              </p>
              <div className="flex space-x-3 sm:space-x-4">
                <a href="#" className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 group">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 group">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 group">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="text-white font-bold text-base sm:text-lg mb-4 sm:mb-6">{t('landing.footer.product.title')}</h4>
              <ul className="space-y-3 sm:space-y-4">
                <li><a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-300 font-medium text-sm sm:text-base">{t('landing.footer.product.features')}</a></li>
                <li><a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-300 font-medium text-sm sm:text-base">{t('landing.footer.product.pricing')}</a></li>
                <li><a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-300 font-medium text-sm sm:text-base">{t('landing.footer.product.apiDocs')}</a></li>
                <li><a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-300 font-medium text-sm sm:text-base">{t('landing.footer.product.integrations')}</a></li>
              </ul>
            </div>
            
            {/* Support */}
            <div>
              <h4 className="text-white font-bold text-base sm:text-lg mb-4 sm:mb-6">{t('landing.footer.support.title')}</h4>
              <ul className="space-y-3 sm:space-y-4">
                <li><a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-300 font-medium text-sm sm:text-base">{t('landing.footer.support.helpCenter')}</a></li>
                <li><a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-300 font-medium text-sm sm:text-base">{t('landing.footer.support.contact')}</a></li>
                <li><a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-300 font-medium text-sm sm:text-base">{t('landing.footer.support.privacy')}</a></li>
                <li><a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-300 font-medium text-sm sm:text-base">{t('landing.footer.support.terms')}</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-700 mt-12 sm:mt-16 pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
            <p className="text-slate-400 font-medium text-sm sm:text-base text-center md:text-left">
              {t('landing.footer.copyright')}
            </p>
            <div className="flex items-center space-x-4">
              <span className="text-slate-400 text-xs sm:text-sm">{t('landing.footer.poweredByAI')}</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
