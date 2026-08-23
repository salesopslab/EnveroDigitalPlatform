// ============================================================
// POST /api/provision-subdomain
// Body: { clientId, companyName }
//
// Every client gets a free subdomain automatically — no DNS, no
// manual Supabase edits, no setup step for the business owner.
// Called once, right after onboarding saves the Business Brain
// for the first time. If the client already has a subdomain, this
// is a no-op and just returns the existing one (safe to call more
// than once).
//
// Uniqueness is enforced here, server-side, with supabaseAdmin —
// a plain client-side query can't check other clients' rows under
// RLS, so this has to run behind the service role.
// ============================================================

import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { slugify } from '../../lib/slugify'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { clientId, companyName } = req.body || {}
  if (!clientId || !companyName) {
    return res.status(400).json({ error: 'clientId and companyName are required' })
  }

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('clients')
    .select('id, subdomain')
    .eq('id', clientId)
    .single()

  if (fetchErr || !existing) return res.status(404).json({ error: 'Client not found' })

  // Already provisioned — nothing to do, just hand it back.
  if (existing.subdomain) {
    return res.status(200).json({ subdomain: existing.subdomain, created: false })
  }

  const base = slugify(companyName) || 'business'
  let candidate = base
  let suffix = 2

  // Try base, then base-2, base-3, ... until we find one that's free.
  // Small tables (thousands of clients, not millions) so a loop here
  // is fine — no need for anything fancier at this scale.
  while (true) {
    const { data: collision } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('subdomain', candidate)
      .maybeSingle()

    if (!collision) break
    candidate = `${base}-${suffix}`
    suffix += 1
  }

  const { error: updateErr } = await supabaseAdmin
    .from('clients')
    .update({ subdomain: candidate })
    .eq('id', clientId)

  if (updateErr) return res.status(500).json({ error: updateErr.message })

  return res.status(200).json({ subdomain: candidate, created: true })
}
