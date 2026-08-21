// ============================================================
// Generic outbound lead webhook — POSTs a JSON payload to a
// client's configured Webhook URL (Zapier, Make, their own CRM
// endpoint, an ESP's inbound trigger, etc.) and logs the result
// to webhook_deliveries. Used by /api/leads (real lead.created
// events, fired the moment a lead is captured) and /api/webhook-test
// (manual test pings triggered from the Integrations page).
//
// Deliberately NOT per-CRM: rather than building and maintaining
// bespoke OAuth integrations for every possible CRM/ESP/SMS tool,
// clients point this at whatever inbound-webhook trigger their tool
// of choice already supports. Works with literally any HTTP endpoint.
// ============================================================

const TIMEOUT_MS = 8000

export async function deliverWebhook({ supabaseAdmin, clientId, url, event, payload, leadId }) {
  let success = false
  let statusCode = null
  let error = null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    let res
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, client_id: clientId, ...payload }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }
    statusCode = res.status
    success = res.ok
    if (!res.ok) error = `Endpoint returned ${res.status}`
  } catch (err) {
    error = err.name === 'AbortError' ? `Timed out after ${TIMEOUT_MS / 1000}s` : err.message
  }

  // Never let a webhook failure break the caller — this always resolves,
  // it just logs what happened so the Integrations page can show it.
  await supabaseAdmin.from('webhook_deliveries').insert({
    client_id: clientId,
    lead_id: leadId || null,
    event,
    url,
    success,
    status_code: statusCode,
    error,
  })

  return { success, statusCode, error }
}
