// ============================================================
// POST /api/verify-custom-domain
// Body: { clientId, domain }
//
// Checks whether the client has actually pointed a CNAME record
// for `domain` at Envero, then saves it either way (verified: true/
// false) so the Settings page can show accurate status instead of
// just trusting whatever the user typed.
//
// IMPORTANT: NETLIFY_SITE_DOMAIN below must be set to this app's
// real Netlify domain (e.g. "your-site-name.netlify.app") in env
// vars. Until that's set correctly, verification will always fail
// even for a correctly configured CNAME — this is a placeholder
// pointing at the value, not a guess at what it is.
// ============================================================

import dns from 'dns'
import { promisify } from 'util'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

const resolveCname = promisify(dns.resolveCname)

// NEXT_PUBLIC_ so the same value can also be displayed in Settings —
// see pages/settings.js DNS instructions box.
const NETLIFY_SITE_DOMAIN = process.env.NEXT_PUBLIC_NETLIFY_SITE_DOMAIN || 'YOUR-NETLIFY-SITE.netlify.app'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { clientId, domain } = req.body || {}
  if (!clientId || !domain) return res.status(400).json({ error: 'clientId and domain are required' })

  const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')

  let verified = false
  let detail = ''

  try {
    const records = await resolveCname(cleanDomain)
    verified = records.some((r) => r.toLowerCase() === NETLIFY_SITE_DOMAIN.toLowerCase())
    detail = verified
      ? 'CNAME correctly points to Envero.'
      : `Found a CNAME, but it points to ${records.join(', ')} instead of ${NETLIFY_SITE_DOMAIN}.`
  } catch (err) {
    detail = 'No CNAME record found yet for this domain — DNS changes can take a few minutes to a few hours to propagate.'
  }

  const { error: updateErr } = await supabaseAdmin
    .from('clients')
    .update({ custom_domain: cleanDomain, custom_domain_verified: verified })
    .eq('id', clientId)

  if (updateErr) return res.status(500).json({ error: updateErr.message })

  return res.status(200).json({ domain: cleanDomain, verified, detail, target: NETLIFY_SITE_DOMAIN })
}
