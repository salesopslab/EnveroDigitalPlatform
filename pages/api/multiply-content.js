// ============================================================
// POST /api/multiply-content
// Body: { clientId, contentId, assetTypes: [{ contentType, platform }] }
// Generates derivative assets (social posts, email, sms, video
// script, etc.) from a primary content item — the "Content
// Multiplier" feature.
// ============================================================

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { clientId, contentId, assetTypes } = req.body || {}
  if (!clientId || !contentId || !Array.isArray(assetTypes) || assetTypes.length === 0) {
    return res.status(400).json({ error: 'clientId, contentId, and a non-empty assetTypes array are required' })
  }

  const [{ data: client }, { data: source }] = await Promise.all([
    supabaseAdmin.from('clients').select('*').eq('id', clientId).single(),
    supabaseAdmin.from('content_items').select('*').eq('id', contentId).single(),
  ])
  if (!client || !source) return res.status(404).json({ error: 'Client or source content not found' })

  const created = []
  const errors = []

  for (const asset of assetTypes) {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Repurpose this content into a ${asset.platform || asset.contentType} ${asset.contentType === 'video_script' ? 'script' : 'post'}. Return ONLY valid JSON with keys: title (short, for internal reference), text (the actual post/script copy, written in this business's brand voice), cta (short call to action).

Brand voice: ${client.brand_voice || 'professional'}
Source title: ${source.title}
Source summary: ${(source.body?.sections || []).map((s) => s.text).join(' ').slice(0, 800)}
Source CTA: ${source.body?.cta || ''}`,
        }],
      })

      const raw = message.content?.[0]?.text || '{}'
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      const draft = JSON.parse(jsonMatch ? jsonMatch[0] : raw)

      const row = {
        client_id: clientId,
        parent_content_id: contentId,
        opportunity_id: source.opportunity_id,
        content_type: asset.contentType,
        platform: asset.platform || null,
        title: draft.title || source.title,
        body: { text: draft.text || '', cta: draft.cta || '' },
        status: 'draft',
      }
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('content_items').insert(row).select().single()
      if (insertErr) throw insertErr
      created.push(inserted)
    } catch (err) {
      errors.push({ asset, error: err.message })
    }
  }

  res.status(created.length > 0 ? 200 : 500).json({ created, errors })
}
