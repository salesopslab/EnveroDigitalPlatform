// ============================================================
// POST /api/publish-social
// Body: { clientId, contentItemId }
// Publishes a social_post content item to whichever platform it's
// tagged for (content_items.platform), using that client's stored
// connection. Marks the item published on success.
// ============================================================

import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { publishToFacebookPage } from '../../lib/metaGraph'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { clientId, contentItemId } = req.body || {}
  if (!clientId || !contentItemId) {
    return res.status(400).json({ error: 'clientId and contentItemId are required' })
  }

  const { data: item } = await supabaseAdmin
    .from('content_items')
    .select('id, platform, content_type, body')
    .eq('id', contentItemId)
    .eq('client_id', clientId)
    .single()

  if (!item) return res.status(404).json({ error: 'Content item not found' })
  if (!item.platform) return res.status(400).json({ error: 'This content item has no platform set' })

  const { data: connection } = await supabaseAdmin
    .from('social_connections')
    .select('*')
    .eq('client_id', clientId)
    .eq('platform', item.platform)
    .single()

  if (!connection) {
    return res.status(400).json({ error: `${item.platform} isn't connected yet -- go to Social and connect it first.` })
  }

  const message = [item.body?.text, item.body?.cta].filter(Boolean).join('\n\n')

  try {
    let platformPostId = null

    if (item.platform === 'facebook') {
      const result = await publishToFacebookPage({
        pageId: connection.platform_account_id,
        pageAccessToken: connection.access_token,
        message,
      })
      platformPostId = result.id
    } else if (item.platform === 'instagram') {
      // Instagram has no text-only post -- every post requires an
      // image or video URL. Content generation doesn't produce
      // images yet, so this is a known, disclosed gap rather than
      // something faked or silently broken.
      return res.status(400).json({
        error: 'Instagram requires an image, and Envero doesn\'t generate images for social posts yet. This is a real gap, not a bug -- publishing Facebook posts works today.',
      })
    } else {
      return res.status(400).json({ error: `Publishing to ${item.platform} isn't built yet.` })
    }

    await supabaseAdmin
      .from('content_items')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', contentItemId)

    return res.status(200).json({ ok: true, platformPostId })
  } catch (err) {
    console.error('Publish failed:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
