// ============================================================
// STRIPE — server-side only
// Mirrors lib/supabaseAdmin.js's "server-only" pattern. Never
// import this in client-side code.
//
// Checkout uses Stripe's own hosted Checkout page (redirect to
// session.url) rather than embedded Stripe.js/Elements — no
// publishable key or client-side Stripe code needed, and it keeps
// PCI scope entirely on Stripe's side. Plan changes/cancellations
// go through Stripe's hosted Customer Portal for the same reason:
// Stripe's own proration/upgrade-downgrade logic, not bespoke code
// here, so behavior stays correct as pricing evolves.
// ============================================================

import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
})

// Maps our internal tier keys to Stripe Price IDs (set up once in the
// Stripe Dashboard — see .env.local.example for the exact steps).
export const TIER_PRICE_IDS = {
  tier1: process.env.STRIPE_PRICE_TIER1,
  tier2: process.env.STRIPE_PRICE_TIER2,
  tier3: process.env.STRIPE_PRICE_TIER3,
}

export const TIER_LABELS = {
  tier1: 'Tier 1 — $299/mo',
  tier2: 'Tier 2 — $599/mo',
  tier3: 'Tier 3 — $999/mo',
}

// Maps a Stripe subscription status onto our clients.status check
// constraint ('trialing' | 'active' | 'past_due' | 'canceled').
export function mapStripeStatus(stripeStatus) {
  if (stripeStatus === 'trialing') return 'trialing'
  if (stripeStatus === 'active') return 'active'
  if (stripeStatus === 'past_due' || stripeStatus === 'unpaid' || stripeStatus === 'incomplete') return 'past_due'
  if (stripeStatus === 'canceled' || stripeStatus === 'incomplete_expired') return 'canceled'
  return 'active'
}
