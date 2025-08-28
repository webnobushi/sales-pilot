import { createClient } from '@supabase/supabase-js'

// import { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'sales-pilot-auth-token',
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
}) 