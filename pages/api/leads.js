// ============================================================
// POST /api/leads
// Public lead-capture endpoint — meant to be called from a
// client's live generated pages (not built yet), so it uses the
// service role key rather than relying on the visitor being
// signed in. Not exposed in any UI yet.
// ============================================================

import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { deliverWebhook } from '../../lib/webhookDelivery'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    clientId, contentItemId, name, email, phone,
    productService, location, sourceUrl, utmSource, utmCampaign, utmContent,
  } = req.body || {}

  if (!clientId || !email) return res.status(400).json({ error: 'clientId and email are required' })

  const { data: inserted, error } = await supabaseAdmin
    .from('leads')
    .insert({
      client_id: clientId,
      content_item_id: contentItemId || null,
      name: name || null,
      email,
      phone: phone || null,
      product_service: productService || null,
      location: location || null,
      source_url: sourceUrl || null,
      utm_source: utmSource || null,
      utm_campaign: utmCampaign || null,
      utm_content: utmContent || null,
      status: 'new',
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // Fire the client's lead webhook, if they've configured one (see
  // /integrations — generic CRM/ESP/SMS distribution via Zapier, Make,
  // or their own endpoint). This never blocks or fails the response to
  // whoever submitted the lead — deliverWebhook logs the outcome to
  // webhook_deliveries instead of throwing.
  const { data: clientRow } = await supabaseAdmin
    .from('clients')
    .select('lead_webhook_url')
    .eq('id', clientId)
    .single()

  if (clientRow?.lead_webhook_url) {
    await deliverWebhook({
      supabaseAdmin,
      clientId,
      url: clientRow.lead_webhook_url,
      event: 'lead.created',
      leadId: inserted.id,
      payload: { lead: inserted },
    })
  }

  res.status(201).json({ lead: inserted })
}
