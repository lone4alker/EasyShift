'use client'

import { useState } from 'react'
import { supabase } from '@/app/utils/supabase'
import Link from 'next/link'

export default function StaffSignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState('email_entry') // 'email_entry' or 'password_creation'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleEmailCheck = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (!email) {
      setError('Please enter your email address.')
      setLoading(false)
      return
    }

    try {
      // Step 1: Check if the email exists in the staff_members table
      const { data, error } = await supabase
        .from('staff_members')
        .select('email')
        .eq('email', email)
        .single()

      if (error && error.code === 'PGRST116') {
        // No row found, which is an expected error for no match
        setError('Your email is not on our staff list. Please contact your manager.')
      } else if (error) {
        throw error
      } else if (data) {
        // Email found, proceed to password creation
        setStep('password_creation')
      }
    } catch (err) {
      console.error('Email check failed:', err.message)
      setError('An error occurred. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordCreation = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }

    try {
      // Step 2: Use the sign-up method to create the user account
      // This will set the new password for the existing email.
      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
      })

      if (error) {
        if (error.message.includes('A user with this email address has already been registered')) {
            setError('This email is already registered. Please use the login page.')
        } else {
            throw error
        }
      } else {
        setSuccess('Account created successfully! You can now log in.')
        // You can optionally redirect the user here
        // router.push('/staff/login')
      }
    } catch (err) {
      console.error('Password creation failed:', err.message)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderForm = () => {
    if (step === 'email_entry') {
      return (
        <form onSubmit={handleEmailCheck} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your work email"
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Checking...' : 'Continue'}
            </button>
          </div>
        </form>
      )
    }

    if (step === 'password_creation') {
      return (
        <form onSubmit={handlePasswordCreation} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">New Password</label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <div className="mt-1">
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Setting Password...' : 'Set Password'}
            </button>
          </div>
        </form>
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Staff Account Setup
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/staff/login" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 text-center text-sm text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 text-center text-sm text-green-600">
              {success}
            </div>
          )}
          {renderForm()}
        </div>
      </div>
    </div>
  )
}