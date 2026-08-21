// ============================================================
// POST /api/create-portal-session
// Opens Stripe's hosted Customer Portal for the signed-in client —
// used for updating a payment method, changing plans, viewing past
// invoices, or canceling. Configure the portal's product catalog once
// in the Stripe Dashboard (Settings → Billing → Customer portal) so
// clients can switch between the 3 tiers there; Stripe handles the
// proration math, so we don't have to build it ourselves.
// ============================================================

import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { requireUser } from '../../lib/requireUser'
import { stripe } from '../../lib/stripe'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user, error: authError } = await requireUser(req)
  if (!user) return res.status(401).json({ error: authError })

  const { data: client, error: clientError } = await supabaseAdmin
    .from('clients')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()
  if (clientError) return res.status(500).json({ error: clientError.message })
  if (!client?.stripe_customer_id) return res.status(400).json({ error: 'No billing account yet — subscribe to a plan first.' })

  const origin = req.headers.origin || `https://${req.headers.host}`

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: client.stripe_customer_id,
    return_url: `${origin}/settings`,
  })

  res.status(200).json({ url: portalSession.url })
}
