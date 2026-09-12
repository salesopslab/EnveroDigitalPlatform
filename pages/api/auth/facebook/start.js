// ============================================================
// GET /api/auth/facebook/start?clientId=...
// Kicks off the Meta OAuth flow. The clientId is carried through
// as the OAuth `state` param so the callback knows which Envero
// client this connection belongs to -- state is also Meta's
// standard CSRF protection mechanism, so this does double duty.
// ============================================================

import { metaOAuthDialogUrl } from '../../../../lib/metaGraph'

export default function handler(req, res) {
  const { clientId } = req.query
  if (!clientId) return res.status(400).send('clientId is required')

  if (!process.env.FACEBOOK_APP_ID) {
    return res.status(500).send(
      'Facebook/Instagram connection is not configured yet -- FACEBOOK_APP_ID is missing. See .env.local.example.'
    )
  }

  const redirectUri = 'https://enverodigital.com/api/auth/facebook/callback'
  const url = metaOAuthDialogUrl({ redirectUri, state: clientId })
  res.writeHead(302, { Location: url })
  res.end()
}
