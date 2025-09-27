'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/utils/supabase';

export default function StaffLogin() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  // Form validation
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  
  const isEmailValid = email.includes('@') && email.includes('.');
  const isPasswordValid = password.length >= 6;
  const isFormValid = isEmailValid && isPasswordValid;

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Staff login error:', error);
      
      // Handle specific error types
      if (error.message.includes('Invalid login credentials')) {
        setError(
          <div>
            <p>Invalid email or password. This could mean:</p>
            <ul className="mt-2 ml-4 list-disc text-sm">
              <li>No staff account exists with this email</li>
              <li>Password is incorrect</li>
              <li>Email hasn&apos;t been confirmed yet</li>
            </ul>
            <p className="mt-2 text-sm">
              <a href="/debug" className="text-emerald-600 hover:underline">Check debug page</a> or{' '}
              <a href="/staff/signup" className="text-emerald-600 hover:underline">create an account</a>
            </p>
          </div>
        );
      } else {
        setError(error.message || 'Login failed. Please try again.');
      }
      setLoading(false);
    } else {
      // Store login preference
      if (rememberMe) {
        localStorage.setItem('rememberStaff', 'true');
        localStorage.setItem('staffEmail', email.trim());
      } else {
        localStorage.removeItem('rememberStaff');
        localStorage.removeItem('staffEmail');
      }
      console.log('Staff login successful:', data.user.id);
      router.push('/staff/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-600/5 via-teal-600/5 to-cyan-600/5"></div>
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="staffGrid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgb(6 182 212 / 0.15)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#staffGrid)" />
        </svg>
      </div>
      
      {/* Floating shapes */}
      <div className="absolute top-32 right-20 w-24 h-24 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-full blur-2xl animate-pulse delay-500"></div>
      <div className="absolute bottom-32 left-20 w-36 h-36 bg-gradient-to-r from-teal-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse delay-1500"></div>
      <div className="absolute top-1/2 left-1/2 w-28 h-28 bg-gradient-to-r from-cyan-400/15 to-blue-400/15 rounded-full blur-2xl animate-pulse"></div>

      {/* Breadcrumb */}
      <div className="relative z-10 pt-4 sm:pt-6">
        <div className="container mx-auto px-4 sm:px-6">
          <nav className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm overflow-x-auto">
            <Link href="/" className="text-slate-500 hover:text-emerald-600 transition-colors duration-200 flex items-center flex-shrink-0">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </Link>
            <span className="text-slate-400 flex-shrink-0">/</span>
            <span className="text-slate-700 font-medium truncate">Staff Login</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen px-4 sm:px-6 py-8 sm:py-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl sm:rounded-2xl shadow-lg mb-3 sm:mb-4 transform hover:scale-105 transition-transform duration-200">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Staff Portal</h1>
            <p className="text-sm sm:text-base text-slate-600">
              Welcome! Access your shifts and schedule
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-xl border border-white/50 p-4 sm:p-6 lg:p-8">
            <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg" role="alert">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-700 font-medium text-sm">{error}</span>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="staff-email" className="block text-sm font-semibold text-slate-700">
                  Work Email
                </label>
                <div className="relative">
                  <input
                    id="staff-email"
                    type="email"
                    placeholder="john.doe@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    className={`btn-responsive w-full px-4 py-3 pl-10 sm:pl-12 rounded-lg border-2 transition-all duration-200 focus:outline-none ${
                      emailTouched && !isEmailValid
                        ? 'border-red-300 focus:border-red-500 bg-red-50'
                        : 'border-slate-200 focus:border-emerald-500 bg-white'
                    }`}
                    required
                  />
                  <svg className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                {emailTouched && !isEmailValid && (
                  <p className="text-red-600 text-sm flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Please enter a valid email address
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="staff-password" className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="staff-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    className={`btn-responsive w-full px-4 py-3 pl-10 sm:pl-12 pr-10 sm:pr-12 rounded-lg border-2 transition-all duration-200 focus:outline-none ${
                      passwordTouched && !isPasswordValid
                        ? 'border-red-300 focus:border-red-500 bg-red-50'
                        : 'border-slate-200 focus:border-emerald-500 bg-white'
                    }`}
                    required
                  />
                  <svg className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
                {passwordTouched && !isPasswordValid && (
                  <p className="text-red-600 text-sm flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Password must be at least 6 characters
                  </p>
                )}
              </div>

              {/* Quick Access Features */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-100">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-emerald-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-emerald-800">Quick Access</span>
                </div>
                <div className="text-xs text-emerald-700 space-y-1">
                  <div>• View your current week schedule</div>
                  <div>• Check upcoming shifts</div>
                  <div>• Request shift swaps</div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !isFormValid}
                className={`btn-responsive w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 ${
                  loading || !isFormValid
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Accessing Portal...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Access Staff Portal
                  </div>
                )}
              </button>
            </form>

            {/* Alternative Actions */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-4">
                  New staff?
                </p>
                <Link
                  href="/staff/signup"
                  className="inline-flex items-center px-4 py-2 border-2 border-slate-200 rounded-lg text-slate-700 hover:border-emerald-300 hover:text-emerald-600 font-medium transition-all duration-200 group"
                >
                  <svg className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Register Staff
                </Link>
              </div>
            </div>
          </div>

          {/* Owner Login Link */}
          <div className="text-center mt-6">
            <p className="text-slate-600 text-sm">
              Are you a business owner?{' '}
              <Link href="/owner/login" className="text-emerald-600 hover:text-emerald-800 font-medium transition-colors duration-200">
                Owner Portal
              </Link>
            </p>
          </div>

          {/* Contact Support */}
          <div className="text-center mt-4">
            <p className="text-xs text-slate-500">
              Need assistance? Contact your manager or{' '}
              <button className="text-emerald-600 hover:text-emerald-800 underline">
                support team
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}