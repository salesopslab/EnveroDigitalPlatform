// ============================================================
// SUPABASE CLIENT — browser/client-side
// Uses the public anon key, safe to expose (Row Level Security
// in Supabase protects the actual data)
// ============================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
