// ============================================================
// Sends an SMS via Twilio's REST API. Raw fetch with HTTP Basic
// Auth rather than the Twilio SDK — same minimal-dependency
// approach as lib/webhookDelivery.js and lib/resendEmail.js.
// Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and
// TWILIO_FROM_NUMBER (a Twilio phone number, e.g. +15551234567, or
// a Messaging Service SID) in .env.local / Netlify env vars.
//
// Callers are expected to have already confirmed the recipient
// consented to SMS (see leads.sms_consent) — this helper just sends.
// ============================================================

export async function sendSms({ to, body }) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER
  if (!sid || !token || !from) {
    return { success: false, error: 'SMS sending is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER missing).' }
  }

  try {
    const params = new URLSearchParams({ To: to, From: from, Body: body })
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      return { success: false, error: `Twilio error ${res.status}: ${errBody.message || 'send failed'}` }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
