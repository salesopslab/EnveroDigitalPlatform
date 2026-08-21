// ============================================================
// POST /api/webhook-test
// Sends a one-off test event to a client's saved lead_webhook_url,
// used by the "Save & Test" button on /integrations. Same delivery
// path (and same webhook_deliveries log) as a real lead.created event.
// ============================================================

import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { deliverWebhook } from '../../lib/webhookDelivery'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { clientId } = req.body || {}
  if (!clientId) return res.status(400).json({ error: 'clientId is required' })

  const { data: clientRow, error } = await supabaseAdmin
    .from('clients')
    .select('lead_webhook_url')
    .eq('id', clientId)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  if (!clientRow?.lead_webhook_url) return res.status(400).json({ error: 'No webhook URL saved yet' })

  const result = await deliverWebhook({
    supabaseAdmin,
    clientId,
    url: clientRow.lead_webhook_url,
    event: 'webhook.test',
    payload: {
      message: 'This is a test event from EnveroDigital Platform.',
      sent_at: new Date().toISOString(),
    },
  })

  res.status(200).json(result)
}
