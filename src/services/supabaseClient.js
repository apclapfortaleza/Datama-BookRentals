import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rvxdwpaqnrjzuwvmjrun.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2eGR3cGFxbnJqenV3dm1qcnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTExMzYsImV4cCI6MjA4NTk2NzEzNn0.ZbAfkL0eaT7Zs1DuLrVbX_Jit93VKM6nizKhbUsxVKg'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
})