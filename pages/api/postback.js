// ============================================================
// GET or POST /api/postback?click_id=...&value=...
//
// This is the URL you give your partner to call when a click we
// sent them converts (becomes a real lead/sale on their end). They
// echo back the envero_click_id we attached in /api/track-click.
//
// Accepts both GET (many lead-gen partners fire postbacks as a
// simple pixel/redirect URL) and POST (if they support a real
// webhook body instead).
//
// On a valid postback, this also creates a row in `leads` so the
// conversion shows up in the normal Lead Center / Attribution views
// alongside leads captured directly through Envero's own forms --
// same as the original spec's Content -> Visitor -> Lead -> Revenue
// loop, just sourced from a partner instead of our own form.
// ============================================================

import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { deliverWebhook } from '../../lib/webhookDelivery'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const params = req.method === 'GET' ? req.query : req.body || {}
  const clickId = params.click_id || params.envero_click_id
  const value = params.value ? Number(params.value) : null

  if (!clickId) return res.status(400).json({ error: 'click_id is required' })

  const { data: click } = await supabaseAdmin
    .from('outbound_clicks')
    .select('*')
    .eq('click_token', clickId)
    .single()

  if (!click) return res.status(404).json({ error: 'Unknown click_id' })

  // Idempotency guard: a page refresh, back-button, or double-fire of a
  // client-side pixel (see settings page instructions) shouldn't create
  // a second duplicate lead for the same conversion.
  if (click.converted) {
    return res.status(200).json({ ok: true, alreadyProcessed: true })
  }

  await supabaseAdmin
    .from('outbound_clicks')
    .update({ converted: true, converted_at: new Date().toISOString(), conversion_value: value })
    .eq('id', click.id)

  // Surface this as a real lead too, so it shows up wherever the rest
  // of the app already looks (Lead Center, Analytics attribution) --
  // not just in the outbound_clicks table nobody else sees.
  const { data: insertedLead } = await supabaseAdmin.from('leads').insert({
    client_id: click.client_id,
    content_item_id: click.content_item_id,
    name: params.name || null,
    email: params.email || null,
    phone: params.phone || null,
    lead_value: value,
    source_url: click.lander_url,
    utm_source: click.utm_source,
    utm_campaign: click.utm_campaign,
    utm_content: click.utm_content,
    status: 'sold', // a postback means the partner already confirmed
    // this converted -- treat it as further along than "new", since
    // no further Envero-side qualification step applies here.
  }).select().single()

  // Fire the same lead.created webhook /api/leads.js fires for direct
  // leads -- without this, partner-sourced conversions would silently
  // never reach the client's CRM/Zapier, even though they show up in
  // Envero's own Lead Center. Same non-blocking pattern: this never
  // fails the postback response, it just logs the outcome.
  const { data: clientRow } = await supabaseAdmin
    .from('clients')
    .select('lead_webhook_url')
    .eq('id', click.client_id)
    .single()

  if (clientRow?.lead_webhook_url && insertedLead) {
    await deliverWebhook({
      supabaseAdmin,
      clientId: click.client_id,
      url: clientRow.lead_webhook_url,
      event: 'lead.created',
      leadId: insertedLead.id,
      payload: { lead: insertedLead, source: 'partner_postback' },
    })
  }

  res.status(200).json({ ok: true })
}
