import { createClient } from '@supabase/supabase-js'

// Replace with your actual Supabase URL and public key from your project settings
const supabaseUrl = 'https://zzwvduqrkwjbyxpsjsqm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6d3ZkdXFya3dqYnl4cHNqc3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTYzMTQsImV4cCI6MjA3NDM5MjMxNH0.xVvWp8fpX1aaEBtmeISDJzjkrNoL920sXrysmif3OyE'

export const supabase = createClient(supabaseUrl, supabaseKey)