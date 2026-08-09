// ============================================================
// SUPABASE ADMIN CLIENT — server-side only
// Uses the service role key, which bypasses Row Level Security.
// NEVER import this in client-side code or expose the key to
// the browser. Only use inside pages/api/* or getServerSideProps.
// ============================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
