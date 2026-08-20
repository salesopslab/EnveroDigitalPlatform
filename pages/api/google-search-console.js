// ============================================================
// POST /api/google-search-console
// Body: { clientId, days }
// Returns real site-wide Search Console totals (clicks,
// impressions, ctr, position) for the client's configured site,
// via the shared service account. This is intentionally
// site-wide, not per-page — the platform doesn't publish
// generated content as live crawlable pages yet (that's Phase 3
// subdomain routing), so per-content-item attribution isn't
// something Google can honestly report on. See analytics.js.
// ============================================================

import { google } from 'googleapis'
import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { getGoogleAuth, GSC_SCOPES } from '../../lib/googleAuth'

function toISODate(d) { return d.toISOString().slice(0, 10) }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { clientId, days } = req.body || {}
  if (!clientId) return res.status(400).json({ error: 'clientId is required' })

  const { data: client, error: clientErr } = await supabaseAdmin
    .from('clients').select('gsc_site_url').eq('id', clientId).single()
  if (clientErr || !client) return res.status(404).json({ error: 'Client not found' })

  if (!client.gsc_site_url) {
    return res.status(200).json({ connected: false })
  }

  try {
    const auth = getGoogleAuth(GSC_SCOPES)
    const searchconsole = google.searchconsole('v1')

    // Search Console data typically lags 2-3 days behind real-time, so end
    // the window a few days back rather than "today" to avoid an
    // artificially low tail.
    const endDate = new Date(Date.now() - 3 * 86400000)
    const startDate = new Date(endDate.getTime() - (days || 30) * 86400000)

    const response = await searchconsole.searchanalytics.query({
      auth,
      siteUrl: client.gsc_site_url,
      requestBody: {
        startDate: toISODate(startDate),
        endDate: toISODate(endDate),
      },
    })

    const row = response.data.rows?.[0]
    res.status(200).json({
      connected: true,
      clicks: row?.clicks || 0,
      impressions: row?.impressions || 0,
      ctr: row?.ctr || 0,
      position: row?.position || 0,
    })
  } catch (err) {
    const message = err.code === 403 || err.response?.status === 403
      ? 'Access not granted yet — add the service account as a user on this Search Console site.'
      : err.message || 'Search Console request failed.'
    res.status(200).json({ connected: true, error: message })
  }
}
