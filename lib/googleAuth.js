// ============================================================
// GOOGLE SERVICE ACCOUNT AUTH — server-side only
// Every client grants this one service account Viewer access to
// their own GA4 property and Search Console site, so there's no
// per-client OAuth flow, no token storage, no refresh logic.
// NEVER import this in client-side code — GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
// must stay server-only. The email is NEXT_PUBLIC_* on purpose: it's
// safe to show clients so they know what to grant access to.
// ============================================================

import { google } from 'googleapis'

export function getGoogleAuth(scopes) {
  const email = process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n')

  if (!email || !key) {
    throw new Error('Google service account is not configured — set NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.')
  }

  return new google.auth.JWT({ email, key, scopes })
}

export const GA4_SCOPES = ['https://www.googleapis.com/auth/analytics.readonly']
export const GSC_SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']

// GA4 property IDs are sometimes pasted as "properties/123456789" and
// sometimes as the bare number — normalize so either works.
export function normalizeGa4PropertyId(input) {
  const trimmed = (input || '').trim()
  if (!trimmed) return ''
  return trimmed.startsWith('properties/') ? trimmed : `properties/${trimmed}`
}
