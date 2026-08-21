// ============================================================
// Verifies the Supabase access token on a billing-sensitive API
// route and returns the real signed-in user — rather than trusting
// a client-supplied clientId the way the simpler test/webhook
// routes do. Worth the extra step here since these routes create
// real Stripe Checkout/Portal sessions tied to a specific account.
//
// Client side: pass `Authorization: Bearer <session.access_token>`
// (from supabase.auth.getSession()) on the fetch call.
// ============================================================

import { supabaseAdmin } from './supabaseAdmin'

export async function requireUser(req) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return { user: null, error: 'Not signed in' }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) return { user: null, error: 'Not signed in' }

  return { user: data.user, error: null }
}
