'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/utils/supabase'

export default function Signup() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const router = useRouter()

  const handleSignup = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      // Step 1: Create the user in Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: username,
          },
          emailRedirectTo: `${window.location.origin}/dash`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setSuccess(null)
        console.error('Signup Error:', signUpError)
        return
      }

      // Step 2: If user creation is successful, insert user data into a separate 'profiles' table
      const user = data.user;
      if (user) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              username: username,
              email: email,
            },
          ]);

        if (insertError) {
          // You may want to handle this more gracefully, e.g., logging an error and still
          // telling the user to check their email, but it's important to know it failed.
          console.error('Database insert error:', insertError);
        }
      }

      setSuccess('Signup successful! Please check your email for a verification link.')
      setError(null)

    } catch (err) {
      setError('An unexpected error occurred.')
      console.error('Unexpected error:', err)
      setSuccess(null)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>Sign Up</h1>
      <form onSubmit={handleSignup}>
        {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
        {success && <p style={{ color: 'green', textAlign: 'center' }}>{success}</p>}

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="username" style={{ display: 'block', marginBottom: '5px' }}>Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Create Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="confirm-password" style={{ display: 'block', marginBottom: '5px' }}>Confirm Password</label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}>
          Sign Up
        </button>
      </form>
    </div>
  )
}
