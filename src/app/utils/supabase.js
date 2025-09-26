import { createClient } from '@supabase/supabase-js'

// Replace with your actual Supabase URL and public key from your project settings
const supabaseUrl = "https://ywxfnndichtssscgtbsy.supabase.co"
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3eGZubmRpY2h0c3NzY2d0YnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NjEyNjYsImV4cCI6MjA3NDQzNzI2Nn0.XvpebY8NpQTOJk77o1jOn7SYLGsrGM89bCo4C6OH4aE'

export const supabase = createClient(supabaseUrl, supabaseKey)