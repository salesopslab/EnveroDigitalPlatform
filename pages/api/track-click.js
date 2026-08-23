// ============================================================
// GET /api/track-click?contentItemId=...
//
// Used instead of Envero's inline lead form when a content_item has
// a lander_url set (a partner's own lead form/page). Logs the click,
// then 302-redirects the visitor to the partner's page with a
// click_token attached as a query param so a later postback (see
// /api/postback) can be matched back to this specific click.
// ============================================================

import { supabaseAdmin } from '../../lib/supabaseAdmin'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { contentItemId, utm_source, utm_campaign, utm_content } = req.query

  if (!contentItemId) return res.status(400).json({ error: 'contentItemId is required' })

  const { data: item } = await supabaseAdmin
    .from('content_items')
    .select('id, client_id, lander_url')
    .eq('id', contentItemId)
    .single()

  if (!item || !item.lander_url) {
    return res.status(404).json({ error: 'No lander configured for this content item' })
  }

  const clickToken = crypto.randomUUID()

  await supabaseAdmin.from('outbound_clicks').insert({
    client_id: item.client_id,
    content_item_id: item.id,
    click_token: clickToken,
    lander_url: item.lander_url,
    utm_source: utm_source || null,
    utm_campaign: utm_campaign || null,
    utm_content: utm_content || null,
    referrer: req.headers.referer || null,
  })

  // Attach our click token to whatever query string the partner's URL
  // already has, so we don't clobber any params they require.
  const destination = new URL(item.lander_url)
  destination.searchParams.set('envero_click_id', clickToken)

  res.writeHead(302, { Location: destination.toString() })
  res.end()
}
