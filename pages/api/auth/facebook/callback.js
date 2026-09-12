// ============================================================
// GET /api/auth/facebook/callback?code=...&state=clientId
// Completes the OAuth flow: exchanges the code for a long-lived
// token, finds the Page(s) the user manages, and stores a
// social_connections row for Facebook -- plus one for Instagram
// too, if that Page has an IG Business Account linked.
//
// Simplification: if the user manages multiple Pages, this connects
// the first one automatically rather than showing a picker. Good
// enough for a single-location business (NCD's case); a real
// Page-picker UI would be a follow-up for multi-location clients.
// ============================================================

import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { exchangeCodeForUserToken, listManagedPages, getLinkedInstagramAccount } from '../../../../lib/metaGraph'

export default async function handler(req, res) {
  const { code, state: clientId, error, error_description } = req.query

  if (error) {
    return res.redirect(`/social?error=${encodeURIComponent(error_description || error)}`)
  }
  if (!code || !clientId) {
    return res.redirect('/social?error=Missing+code+or+client')
  }

  try {
    const redirectUri = 'https://enverodigital.com/api/auth/facebook/callback'
    const userToken = await exchangeCodeForUserToken({ code, redirectUri })

    const pages = await listManagedPages(userToken)
    if (pages.length === 0) {
      return res.redirect('/social?error=No+Facebook+Pages+found+on+this+account')
    }

    const page = pages[0] // see simplification note above
    const now = new Date().toISOString()

    await supabaseAdmin.from('social_connections').upsert({
      client_id: clientId,
      platform: 'facebook',
      access_token: page.access_token,
      expires_at: null, // Meta Page tokens derived from a long-lived
      // user token don't carry their own short expiry
      platform_account_id: page.id,
      platform_account_name: page.name,
      scopes: (page.tasks || []).join(' '),
      updated_at: now,
    }, { onConflict: 'client_id,platform' })

    const igAccount = await getLinkedInstagramAccount(page.id, page.access_token)
    if (igAccount) {
      await supabaseAdmin.from('social_connections').upsert({
        client_id: clientId,
        platform: 'instagram',
        access_token: page.access_token, // IG posts are authenticated
        // via the linked Page's token, not a separate IG token
        expires_at: null,
        platform_account_id: igAccount.id,
        platform_account_name: igAccount.username,
        updated_at: now,
      }, { onConflict: 'client_id,platform' })
    }

    return res.redirect('/social?connected=facebook')
  } catch (err) {
    console.error('Facebook OAuth callback failed:', err.message)
    return res.redirect(`/social?error=${encodeURIComponent(err.message)}`)
  }
}
