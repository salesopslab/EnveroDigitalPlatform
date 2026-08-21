// ============================================================
// POST /api/create-checkout-session
// { tier: 'tier1' | 'tier2' | 'tier3' }
// Creates a Stripe Checkout session for the signed-in client to
// subscribe, and returns its hosted URL to redirect the browser to.
// Actual tier/status activation happens in pages/api/stripe-webhook.js
// once Stripe confirms payment — never trust the client-side redirect
// alone for that.
// ============================================================

import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { requireUser } from '../../lib/requireUser'
import { stripe, TIER_PRICE_IDS } from '../../lib/stripe'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user, error: authError } = await requireUser(req)
  if (!user) return res.status(401).json({ error: authError })

  const { tier } = req.body || {}
  const priceId = TIER_PRICE_IDS[tier]
  if (!priceId) return res.status(400).json({ error: `Unknown or unconfigured tier: ${tier}` })

  const { data: client, error: clientError } = await supabaseAdmin
    .from('clients')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()
  if (clientError) return res.status(500).json({ error: clientError.message })

  let customerId = client?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { client_id: user.id },
    })
    customerId = customer.id
    await supabaseAdmin.from('clients').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const origin = req.headers.origin || `https://${req.headers.host}`

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/settings?checkout=success`,
    cancel_url: `${origin}/settings?checkout=canceled`,
    metadata: { client_id: user.id, tier },
    subscription_data: { metadata: { client_id: user.id, tier } },
  })

  res.status(200).json({ url: session.url })
}
