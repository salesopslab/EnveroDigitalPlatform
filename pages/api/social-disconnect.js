// ============================================================
// POST /api/social-disconnect
// Body: { clientId, platform }
// Deletes a stored connection. Server-side only (supabaseAdmin) --
// social_connections has no client-writable RLS policy on purpose,
// since it holds access tokens.
// ============================================================

import { supabaseAdmin } from '../../lib/supabaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { clientId, platform } = req.body || {}
  if (!clientId || !platform) return res.status(400).json({ error: 'clientId and platform are required' })

  const { error } = await supabaseAdmin
    .from('social_connections')
    .delete()
    .eq('client_id', clientId)
    .eq('platform', platform)

  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ ok: true })
}
