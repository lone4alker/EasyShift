'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-inter">
      {/* Header */}
      <header className="border-b border-blue-200/30 bg-white/95 backdrop-blur-lg shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <svg className="h-9 w-9 text-blue-600 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full opacity-80"></div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent tracking-tight">ShiftEasy</span>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <button className="px-5 py-2.5 border-2 border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 cursor-pointer font-medium tracking-wide shadow-sm hover:shadow-md">
                  Owner Portal
                </button>
              </Link>
              <Link href="/setup">
                <button className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-300 cursor-pointer font-semibold tracking-wide shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                  Get Started
                </button>
              </Link>
              <Link href="/staff-portal">
                <button className="px-4 py-2.5 text-slate-600 hover:text-blue-600 transition-all duration-300 cursor-pointer font-medium tracking-wide hover:bg-blue-50 rounded-lg">
                  Staff Login
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-32">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-indigo-600/5 to-purple-600/5"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-indigo-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-1000"></div>
        
        <div className="container mx-auto px-6 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-7">
                <div className="space-y-5">
                  <div className="inline-flex items-center px-3 py-1.5 bg-blue-100/80 rounded-full text-blue-700 text-xs font-semibold tracking-wide backdrop-blur-sm">
                    🚀 AI-Powered Scheduling Revolution
                  </div>
                  <h1 className="text-3xl lg:text-5xl font-bold leading-tight tracking-tight">
                    <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">AI-Powered Staff</span>
                    <br />
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Scheduling</span>
                    <br />
                    <span className="text-slate-800">Made Simple</span>
                  </h1>
                  <p className="text-lg lg:text-xl text-slate-600 leading-relaxed font-medium max-w-2xl">
                    Stop spending hours on shift planning. Let AI optimize your part-time staff schedules automatically, 
                    ensuring <span className="text-blue-600 font-semibold">fair coverage</span> while respecting availability.
                  </p>
                </div>              <div className="flex flex-col sm:flex-row gap-5">
                <Link href="/setup">
                  <button className="group w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3.5 rounded-xl text-base font-semibold transition-all duration-300 flex items-center justify-center cursor-pointer shadow-xl hover:shadow-blue-500/25 transform hover:-translate-y-1">
                    Start Free Setup
                    <svg className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
                <button className="group w-full sm:w-auto border-2 border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-blue-50/50 transition-all duration-300 cursor-pointer backdrop-blur-sm">
                  <span className="flex items-center justify-center">
                    Watch Demo
                    <svg className="ml-2 h-4 w-4 group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </span>
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center space-x-6 pt-6">
                <div className="text-center">
                  <div className="text-xl font-bold text-slate-800">500+</div>
                  <div className="text-xs text-slate-600 font-medium">Happy Businesses</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-slate-800">10K+</div>
                  <div className="text-xs text-slate-600 font-medium">Shifts Generated</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-slate-800">98%</div>
                  <div className="text-xs text-slate-600 font-medium">Satisfaction</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-gradient-to-br from-white to-blue-50/50 rounded-3xl shadow-2xl border border-blue-100/50 backdrop-blur-xl p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-800">Weekly Schedule</h3>
                    <span className="text-sm text-green-600 font-semibold bg-green-100 px-3 py-1 rounded-full">AI Optimized ✨</span>
                  </div>
                  <div className="space-y-4">
                    {['Monday', 'Tuesday', 'Wednesday'].map((day, i) => (
                      <div key={day} className="flex items-center justify-between p-4 bg-white/80 rounded-xl border border-slate-100 backdrop-blur-sm">
                        <div>
                          <div className="font-semibold text-slate-800">{day}</div>
                          <div className="text-sm text-slate-600">9:00 AM - 5:00 PM</div>
                        </div>
                        <div className="flex -space-x-2">
                          <div className={`w-8 h-8 rounded-full border-2 border-white ${i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-green-500' : 'bg-purple-500'}`}></div>
                          <div className={`w-8 h-8 rounded-full border-2 border-white ${i === 0 ? 'bg-green-500' : i === 1 ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
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
      <section className="py-24 bg-white relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-white"></div>
        <div className="container mx-auto px-6 relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full text-blue-700 text-xs font-semibold tracking-wide mb-4">
              ⚡ Powerful Features
            </div>
            <h2 className="text-2xl lg:text-4xl font-bold mb-4 leading-tight">
              <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Everything You Need for</span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Smart Scheduling</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Designed specifically for small shops with part-time staff. No AI experience required—just results.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group bg-gradient-to-br from-white to-blue-50/30 rounded-3xl shadow-xl border border-blue-100/50 p-8 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 transform hover:-translate-y-2">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-800 group-hover:text-blue-600 transition-colors duration-300">AI-Optimized Schedules</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Our intelligent AI considers staff availability, business hours, and workload to create optimal shift patterns that maximize efficiency.
              </p>
            </div>

            <div className="group bg-gradient-to-br from-white to-green-50/30 rounded-3xl shadow-xl border border-green-100/50 p-8 hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-500 transform hover:-translate-y-2">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-800 group-hover:text-green-600 transition-colors duration-300">Fair Staff Rotation</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Ensure equal opportunities and prevent burnout with intelligent shift distribution that keeps everyone happy and engaged.
              </p>
            </div>

            <div className="group bg-gradient-to-br from-white to-purple-50/30 rounded-3xl shadow-xl border border-purple-100/50 p-8 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 transform hover:-translate-y-2">
              <div className="mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-800 group-hover:text-purple-600 transition-colors duration-300">Mobile Staff Portal</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Staff can check their shifts, swap with colleagues, and update availability on their phones with our intuitive mobile app.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50/30 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400/10 rounded-full mix-blend-multiply filter blur-3xl"></div>
        
        <div className="container mx-auto px-6 relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-100 to-blue-100 rounded-full text-green-700 text-xs font-semibold tracking-wide mb-4">
              🚀 Simple 3-Step Process
            </div>
            <h2 className="text-2xl lg:text-4xl font-bold mb-4 leading-tight">
              <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Get Started in</span>
              <br />
              <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">Minutes</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              No technical setup required. Just add your business details and staff—our AI handles the rest.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl font-black text-white">1</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white"></div>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-800 group-hover:text-blue-600 transition-colors duration-300">Setup Your Shop</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Enter your business hours, roles, and basic information in our intuitive interface.
              </p>
              <div className="mt-6 flex justify-center">
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
              <h3 className="text-2xl font-bold mb-4 text-slate-800 group-hover:text-green-600 transition-colors duration-300">Add Your Staff</h3>
              <p className="text-slate-600 leading-relaxed font-medium text-lg">
                Add part-time workers with their availability, skills, and contact details effortlessly.
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
              <h3 className="text-2xl font-bold mb-4 text-slate-800 group-hover:text-purple-600 transition-colors duration-300">Generate Schedules</h3>
              <p className="text-slate-600 leading-relaxed font-medium text-lg">
                Click one button and let our AI create perfectly optimized shift schedules instantly.
              </p>
              <div className="mt-6">
                <div className="inline-flex items-center px-4 py-2 bg-purple-100 rounded-full text-purple-700 text-sm font-semibold">
                  ✨ AI Magic Happens Here
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-indigo-600/90"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-60 h-60 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>
        
        <div className="container mx-auto px-6 text-center relative">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-semibold tracking-wide mb-8">
              🎉 Join The Revolution
            </div>
            
            <h2 className="text-2xl lg:text-4xl font-bold text-white mb-6 leading-tight">
              Ready to Simplify Your
              <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">Scheduling?</span>
            </h2>
            
            <p className="text-lg lg:text-xl text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join <span className="text-yellow-300 font-semibold">hundreds of small shop owners</span> who've saved hours every week with AI-powered scheduling magic.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link href="/setup">
                <button className="group bg-white text-blue-600 px-8 py-4 rounded-xl text-base font-bold hover:bg-blue-50 transition-all duration-300 flex items-center justify-center cursor-pointer shadow-xl hover:shadow-white/25 transform hover:-translate-y-1 hover:scale-105">
                  Start Your Free Setup
                  <svg className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </Link>
              
              <div className="text-white/80 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  <span>No credit card required</span>
                </div>
              </div>
            </div>
            
            {/* Social Proof */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pt-12 border-t border-white/20">
              <div className="text-center">
                <div className="text-xl lg:text-2xl font-bold text-white mb-1">500+</div>
                <div className="text-blue-200 text-sm">Happy Businesses</div>
              </div>
              <div className="text-center">
                <div className="text-xl lg:text-2xl font-bold text-white mb-1">50hrs</div>
                <div className="text-blue-200 text-sm">Average Time Saved/Month</div>
              </div>
              <div className="text-center">
                <div className="text-xl lg:text-2xl font-bold text-white mb-1">24/7</div>
                <div className="text-blue-200 text-sm">Expert Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-indigo-900/20"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        
        <div className="container mx-auto px-6 relative">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            {/* Brand Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <svg className="h-10 w-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full"></div>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">ShiftEasy</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-base max-w-md">
                Revolutionizing workforce planning for small businesses with AI-powered scheduling that actually works.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 group">
                  <svg className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 group">
                  <svg className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="#" className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 group">
                  <svg className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="text-white font-bold text-lg mb-6">Product</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-300 font-medium">Features</a></li>
                <li><a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-300 font-medium">Pricing</a></li>
                <li><a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-300 font-medium">API Docs</a></li>
                <li><a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-300 font-medium">Integrations</a></li>
              </ul>
            </div>
            
            {/* Support */}
            <div>
              <h4 className="text-white font-bold text-lg mb-6">Support</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-300 font-medium">Help Center</a></li>
                <li><a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-300 font-medium">Contact Us</a></li>
                <li><a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-300 font-medium">Privacy Policy</a></li>
                <li><a href="#" className="text-slate-300 hover:text-blue-400 transition-colors duration-300 font-medium">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-700 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-400 font-medium">
              © 2025 ShiftEasy. All rights reserved. Built with ❤️ for small businesses.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <span className="text-slate-400 text-sm">Powered by AI</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
