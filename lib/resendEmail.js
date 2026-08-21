// ============================================================
// Sends a transactional email via Resend's REST API
// (https://resend.com). Raw fetch rather than their SDK — it's a
// single POST, same minimal-dependency approach as
// lib/webhookDelivery.js. Requires RESEND_API_KEY and
// REVIEW_REQUEST_FROM_EMAIL (a sender address on a domain you've
// verified with Resend) in .env.local / Netlify env vars.
// ============================================================

export async function sendEmail({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.REVIEW_REQUEST_FROM_EMAIL
  if (!apiKey || !from) {
    return { success: false, error: 'Email sending is not configured (RESEND_API_KEY / REVIEW_REQUEST_FROM_EMAIL missing).' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, text }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { success: false, error: `Resend error ${res.status}: ${body.slice(0, 200)}` }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
