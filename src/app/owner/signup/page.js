'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/utils/supabase'

export default function OwnerSignup() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Business Information
    shopName: '',
    businessType: '',
    address: '',
    phone: '',
    
    // Step 2: Operating Schedule
    openingTime: '09:00',
    closingTime: '18:00',
    operatingDays: {
      monday: false,
      tuesday: true,
      wednesday: true,
      thursday: false,
      friday: false,
      saturday: true,
      sunday: true
    },
    
    // Step 3: Staff Roles
    selectedRoles: []
  })

  const businessTypes = [
    'Restaurant', 'Cafe', 'Retail Store', 'Salon', 'Gym', 'Cleaning Service', 
    'Medical Practice', 'Dental Office', 'Hotel', 'Other'
  ]

  const staffRoles = [
    'Barista', 'Cashier', 'Server', 'Cook', 'Cleaner', 'Manager',
    'Sales Associate', 'Helper', 'Security', 'Other'
  ]

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleOperatingDay = (day) => {
    setFormData(prev => ({
      ...prev,
      operatingDays: {
        ...prev.operatingDays,
        [day]: !prev.operatingDays[day]
      }
    }))
  }

  const toggleStaffRole = (role) => {
    setFormData(prev => {
      const isSelected = prev.selectedRoles.includes(role)
      return {
        ...prev,
        selectedRoles: isSelected
          ? prev.selectedRoles.filter(r => r !== role)
          : [...prev.selectedRoles, role]
      }
    })
  }

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 3))
      setError(null)
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    setError(null)
  }

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.shopName.trim()) {
          setError('Shop name is required')
          return false
        }
        if (!formData.businessType) {
          setError('Please select a business type')
          return false
        }
        return true
      case 2:
        const hasOperatingDay = Object.values(formData.operatingDays).some(day => day)
        if (!hasOperatingDay) {
          setError('Please select at least one operating day')
          return false
        }
        return true
      case 3:
        if (formData.selectedRoles.length === 0) {
          setError('Please select at least one staff role')
          return false
        }
        return true
      default:
        return true
    }
  }

  const handleComplete = async () => {
    if (!validateCurrentStep()) return
    
    setLoading(true)
    setError(null)

    try {
      // Here you would save the business setup data
      // For now, just redirect to login
      console.log('Business setup completed:', formData)
      router.push('/owner/login?setup=complete')
    } catch (err) {
      setError('An error occurred while setting up your business')
      console.error('Setup error:', err)
    } finally {
      setLoading(false)
    }
  }

  const renderProgressBar = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-sm transition-all duration-300 ${
            step < currentStep 
              ? 'bg-green-500 text-white' 
              : step === currentStep 
                ? 'bg-blue-600 text-white ring-4 ring-blue-200' 
                : 'bg-slate-200 text-slate-600'
          }`}>
            {step < currentStep ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              step
            )}
          </div>
          {step < 3 && (
            <div className={`w-16 h-1 mx-2 transition-all duration-300 ${
              step < currentStep ? 'bg-green-500' : 'bg-slate-200'
            }`}></div>
          )}
        </div>
      ))}
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Business Information</h2>
        <p className="text-slate-600">Tell us about your business</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">
            Shop Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Coffee Corner"
            value={formData.shopName}
            onChange={(e) => updateFormData('shopName', e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">Business Type</label>
          <select
            value={formData.businessType}
            onChange={(e) => updateFormData('businessType', e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200"
          >
            <option value="">Select type</option>
            {businessTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">Address (Optional)</label>
          <div className="relative">
            <input
              type="text"
              placeholder="123 Main St, City"
              value={formData.address}
              onChange={(e) => updateFormData('address', e.target.value)}
              className="w-full px-4 py-3 pl-10 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200"
            />
            <svg className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">Phone (Optional)</label>
          <input
            type="tel"
            placeholder="(555) 123-4567"
            value={formData.phone}
            onChange={(e) => updateFormData('phone', e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200"
          />
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Operating Schedule</h2>
        <p className="text-slate-600">When is your business open?</p>
      </div>

      <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
        <div className="flex items-center mb-6">
          <div className="w-6 h-6 rounded-full border-4 border-blue-600 mr-3"></div>
          <h3 className="text-lg font-semibold text-slate-800">Operating Hours</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Opening Time</label>
            <div className="relative">
              <input
                type="time"
                value={formData.openingTime}
                onChange={(e) => updateFormData('openingTime', e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200"
              />
              <svg className="absolute right-3 top-3.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Closing Time</label>
            <div className="relative">
              <input
                type="time"
                value={formData.closingTime}
                onChange={(e) => updateFormData('closingTime', e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200"
              />
              <svg className="absolute right-3 top-3.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            Operating Days <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(formData.operatingDays).map(([day, isSelected]) => (
              <label key={day} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOperatingDay(day)}
                  className="w-5 h-5 text-blue-600 bg-white border-2 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700 capitalize">
                  {day}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Staff Roles</h2>
        <p className="text-slate-600">What roles do you need to schedule?</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-800">
            Staff Roles <span className="text-red-500">*</span>
          </h3>
        </div>

        <p className="text-sm text-slate-600 mb-6">
          Select the roles you need to schedule. You can add specific staff members for each role in the next step.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {staffRoles.map(role => (
            <label key={role} className="flex items-center space-x-3 cursor-pointer p-3 border-2 border-slate-200 rounded-lg hover:border-blue-300 transition-colors duration-200">
              <input
                type="checkbox"
                checked={formData.selectedRoles.includes(role)}
                onChange={() => toggleStaffRole(role)}
                className="w-5 h-5 text-blue-600 bg-white border-2 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">{role}</span>
            </label>
          ))}
        </div>

        {formData.selectedRoles.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
            <h4 className="text-sm font-semibold text-green-800 mb-2">Selected Roles:</h4>
            <div className="flex flex-wrap gap-2">
              {formData.selectedRoles.map(role => (
                <span key={role} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {role}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/5 via-indigo-600/5 to-purple-600/5"></div>
        <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgb(59 130 246 / 0.1)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Breadcrumb */}
      <div className="relative z-10 pt-6">
        <div className="container mx-auto px-6">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-slate-500 hover:text-blue-600 transition-colors duration-200 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </Link>
            <span className="text-slate-400">/</span>
            <span className="text-slate-700 font-medium">Setup Your Business</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-slate-800 mb-4">Setup Your Business</h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Let's get your business ready for AI-powered scheduling in 3 easy steps
            </p>
          </div>

          {/* Progress Bar */}
          {renderProgressBar()}

          {/* Step Labels */}
          <div className="text-center mb-8">
            <p className="text-lg font-semibold text-slate-700">
              Step {currentStep}: {
                currentStep === 1 ? 'Business Information' :
                currentStep === 2 ? 'Operating Schedule' :
                'Staff Roles'
              }
            </p>
          </div>

          {/* Form Content */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 mb-8">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg mb-6" role="alert">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700 font-medium">{error}</span>
                </div>
              </div>
            )}

            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                currentStep === 1
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-white border-2 border-slate-300 text-slate-700 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {currentStep === 1 ? 'Back' : 'Previous'}
            </button>

            {currentStep < 3 ? (
              <button
                onClick={nextStep}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center"
              >
                Next Step
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Setting up...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Footer Links */}
          <div className="text-center mt-8">
            <p className="text-slate-600 text-sm">
              Already have an account?{' '}
              <Link href="/owner/login" className="text-blue-600 hover:text-blue-800 font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
