import { createClient } from '@supabase/supabase-js'

// Get Supabase URL and key from environment variables or fallback to hardcoded values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ywxfnndichtssscgtbsy.supabase.co"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3eGZubmRpY2h0c3NzY2d0YnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NjEyNjYsImV4cCI6MjA3NDQzNzI2Nn0.XvpebY8NpQTOJk77o1jOn7SYLGsrGM89bCo4C6OH4aE'

// Validate that we have the required configuration
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.')
}

// Create Supabase client with additional options for better debugging
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Export a function to check if Supabase is properly configured
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Supabase connection error:', error)
      return false
    }
    console.log('Supabase connection successful')
    return true
  } catch (err) {
    console.error('Failed to connect to Supabase:', err)
    return false
  }
}