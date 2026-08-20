// ============================================================
// POST /api/google-analytics
// Body: { clientId, days }
// Returns real organic-search visitor counts from GA4 for the
// client's configured property, via the shared service account.
// Never throws on a missing/unauthorized property — returns a
// { connected, error } shape so the dashboard can show a clear
// message instead of crashing.
// ============================================================

import { google } from 'googleapis'
import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { getGoogleAuth, GA4_SCOPES, normalizeGa4PropertyId } from '../../lib/googleAuth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { clientId, days } = req.body || {}
  if (!clientId) return res.status(400).json({ error: 'clientId is required' })

  const { data: client, error: clientErr } = await supabaseAdmin
    .from('clients').select('ga4_property_id').eq('id', clientId).single()
  if (clientErr || !client) return res.status(404).json({ error: 'Client not found' })

  if (!client.ga4_property_id) {
    return res.status(200).json({ connected: false })
  }

  try {
    const auth = getGoogleAuth(GA4_SCOPES)
    const analyticsdata = google.analyticsdata('v1beta')

    const response = await analyticsdata.properties.runReport({
      auth,
      property: normalizeGa4PropertyId(client.ga4_property_id),
      requestBody: {
        dateRanges: [{ startDate: `${days || 30}daysAgo`, endDate: 'today' }],
        metrics: [{ name: 'activeUsers' }],
        dimensionFilter: {
          filter: {
            fieldName: 'sessionDefaultChannelGroup',
            stringFilter: { value: 'Organic Search' },
          },
        },
        metricAggregations: ['TOTAL'],
      },
    })

    const organicUsers = Number(response.data.totals?.[0]?.metricValues?.[0]?.value || 0)
    res.status(200).json({ connected: true, organicUsers })
  } catch (err) {
    // Most common case here is a 403 — the service account hasn't been
    // granted Viewer access on this property yet. Surface it plainly
    // rather than a raw Google API stack trace.
    const message = err.code === 403 || err.response?.status === 403
      ? 'Access not granted yet — add the service account as a Viewer on this GA4 property.'
      : err.message || 'Google Analytics request failed.'
    res.status(200).json({ connected: true, error: message })
  }
}
