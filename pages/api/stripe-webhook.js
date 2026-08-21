// ============================================================
// POST /api/stripe-webhook
// Stripe calls this whenever a subscription's state changes — this
// is the ONLY place that actually flips a client's tier/status.
// The Checkout redirect (success_url) is just a UI nicety; never
// trust it alone, since a user could hit that URL without paying.
//
// Requires the RAW request body for signature verification, so the
// Next.js API route body parser is disabled below and we read the
// stream ourselves — parsing it as JSON first (like every other
// route in this app) would invalidate Stripe's signature.
//
// Register this URL as a webhook endpoint in the Stripe Dashboard
// (Developers → Webhooks) pointed at https://enverodigital.com/api/stripe-webhook,
// subscribed to at least: checkout.session.completed,
// customer.subscription.updated, customer.subscription.deleted,
// invoice.payment_failed. Put the signing secret it gives you in
// STRIPE_WEBHOOK_SECRET.
// ============================================================

import { stripe, mapStripeStatus } from '../../lib/stripe'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

export const config = {
  api: { bodyParser: false },
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const signature = req.headers['stripe-signature']
  const rawBody = await readRawBody(req)

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const clientId = session.metadata?.client_id
        const tier = session.metadata?.tier
        if (clientId) {
          await supabaseAdmin.from('clients').update({
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            ...(tier ? { tier } : {}),
            status: 'active',
          }).eq('id', clientId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const clientId = subscription.metadata?.client_id
        const tier = subscription.metadata?.tier
        if (clientId) {
          await supabaseAdmin.from('clients').update({
            stripe_subscription_id: subscription.id,
            status: mapStripeStatus(subscription.status),
            ...(tier ? { tier } : {}),
          }).eq('id', clientId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const clientId = subscription.metadata?.client_id
        if (clientId) {
          await supabaseAdmin.from('clients').update({ status: 'canceled' }).eq('id', clientId)
        } else {
          // Fallback if metadata is ever missing — match on the subscription id instead.
          await supabaseAdmin.from('clients').update({ status: 'canceled' }).eq('stripe_subscription_id', subscription.id)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        if (invoice.subscription) {
          await supabaseAdmin.from('clients').update({ status: 'past_due' }).eq('stripe_subscription_id', invoice.subscription)
        }
        break
      }

      default:
        // Unhandled event types are ignored on purpose — Stripe sends many
        // more than we act on; acknowledging with 200 avoids Stripe retrying
        // events we don't care about.
        break
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err)
    return res.status(500).json({ error: 'Webhook handler failed' })
  }

  res.status(200).json({ received: true })
}
