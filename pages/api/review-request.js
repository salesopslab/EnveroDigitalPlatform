// ============================================================
// POST /api/review-request
// Body: { clientId, leadId }
// Sends a Google review request to one lead — by email if they
// have one, by SMS if they have a phone AND sms_consent is true.
// Used both automatically (when a lead is marked "sold", see
// pages/leads.js) and manually (the "Request review" button on
// /leads).
//
// Compliance note: Google's Rating Manipulation policy prohibits
// "review gating" — filtering who gets asked, or what they're asked
// to write, based on predicted sentiment. This route sends the exact
// same neutral message to every lead every time, regardless of
// anything else about them. Don't add sentiment filtering here.
// ============================================================

import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { sendEmail } from '../../lib/resendEmail'
import { sendSms } from '../../lib/twilioSms'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { clientId, leadId } = req.body || {}
  if (!clientId || !leadId) return res.status(400).json({ error: 'clientId and leadId are required' })

  const [{ data: client }, { data: lead }] = await Promise.all([
    supabaseAdmin.from('clients').select('*').eq('id', clientId).single(),
    supabaseAdmin.from('leads').select('*').eq('id', leadId).eq('client_id', clientId).single(),
  ])
  if (!client || !lead) return res.status(404).json({ error: 'Client or lead not found' })
  if (!client.google_place_id) return res.status(400).json({ error: 'Add your Google Place ID under Integrations first.' })

  const reviewLink = `https://search.google.com/local/writereview?placeid=${client.google_place_id}`
  const businessName = client.company_name || 'us'
  const firstName = lead.name ? lead.name.split(' ')[0] : ''
  // Same neutral wording for every recipient, every time — no sentiment
  // filtering, no incentive, no directed content. See compliance note above.
  const message = `Hi${firstName ? ' ' + firstName : ''}, thank you for choosing ${businessName}. We'd love your honest feedback — would you mind leaving us a quick Google review? ${reviewLink}`

  const results = []

  if (lead.email) {
    const r = await sendEmail({
      to: lead.email,
      subject: `How did we do${firstName ? ', ' + firstName : ''}?`,
      text: message,
    })
    results.push({ channel: 'email', ...r })
    await supabaseAdmin.from('review_requests').insert({
      client_id: clientId, lead_id: leadId, channel: 'email', recipient: lead.email,
      success: r.success, error: r.error || null,
    })
  }

  if (lead.phone) {
    if (lead.sms_consent) {
      const r = await sendSms({ to: lead.phone, body: message })
      results.push({ channel: 'sms', ...r })
      await supabaseAdmin.from('review_requests').insert({
        client_id: clientId, lead_id: leadId, channel: 'sms', recipient: lead.phone,
        success: r.success, error: r.error || null,
      })
    } else {
      results.push({ channel: 'sms', success: false, error: 'Skipped — no SMS consent on file for this lead.' })
    }
  }

  if (results.length === 0) return res.status(400).json({ error: 'This lead has no email or phone on file.' })

  const anySuccess = results.some((r) => r.success)
  if (anySuccess) {
    await supabaseAdmin.from('leads').update({ review_requested_at: new Date().toISOString() }).eq('id', leadId)
  }

  res.status(200).json({ results })
}
