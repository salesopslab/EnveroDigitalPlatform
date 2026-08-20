// ============================================================
// POST /api/google-test-connection
// Body: { ga4PropertyId?, gscSiteUrl? }
// Used by the Integrations page's "Save & Test" button — makes a
// minimal live call against whichever field was provided, so
// Aaron gets immediate pass/fail feedback (most commonly: access
// hasn't been granted to the service account yet) before the
// value gets saved onto the client row.
// ============================================================

import { google } from 'googleapis'
import { getGoogleAuth, GA4_SCOPES, GSC_SCOPES, normalizeGa4PropertyId } from '../../lib/googleAuth'

function toISODate(d) { return d.toISOString().slice(0, 10) }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { ga4PropertyId, gscSiteUrl } = req.body || {}
  const result = {}

  if (ga4PropertyId) {
    try {
      const auth = getGoogleAuth(GA4_SCOPES)
      const analyticsdata = google.analyticsdata('v1beta')
      await analyticsdata.properties.runReport({
        auth,
        property: normalizeGa4PropertyId(ga4PropertyId),
        requestBody: {
          dateRanges: [{ startDate: 'today', endDate: 'today' }],
          metrics: [{ name: 'activeUsers' }],
        },
      })
      result.ga4 = { ok: true }
    } catch (err) {
      result.ga4 = { ok: false, error: err.response?.status === 403 || err.code === 403
        ? 'Access not granted — add the service account as a Viewer on this GA4 property.'
        : err.message }
    }
  }

  if (gscSiteUrl) {
    try {
      const auth = getGoogleAuth(GSC_SCOPES)
      const searchconsole = google.searchconsole('v1')
      const endDate = new Date(Date.now() - 3 * 86400000)
      const startDate = new Date(endDate.getTime() - 86400000)
      await searchconsole.searchanalytics.query({
        auth,
        siteUrl: gscSiteUrl,
        requestBody: { startDate: toISODate(startDate), endDate: toISODate(endDate) },
      })
      result.gsc = { ok: true }
    } catch (err) {
      result.gsc = { ok: false, error: err.response?.status === 403 || err.code === 403
        ? 'Access not granted — add the service account as a user on this Search Console site.'
        : err.message }
    }
  }

  res.status(200).json(result)
}
