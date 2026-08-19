// ============================================================
// POST /api/generate-content
// Body: { clientId, opportunityId }
// Generates a structured content_items draft from an opportunity
// + the client's Business Brain (voice, offer, conversion goal).
// ============================================================

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { computeSeoScore } from '../../lib/seoScore'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { clientId, opportunityId } = req.body || {}
  if (!clientId || !opportunityId) return res.status(400).json({ error: 'clientId and opportunityId are required' })

  const [{ data: client }, { data: opportunity }] = await Promise.all([
    supabaseAdmin.from('clients').select('*').eq('id', clientId).single(),
    supabaseAdmin.from('opportunities').select('*').eq('id', opportunityId).single(),
  ])
  if (!client || !opportunity) return res.status(404).json({ error: 'Client or opportunity not found' })

  await supabaseAdmin.from('opportunities').update({ status: 'creating' }).eq('id', opportunityId)

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2500,
      messages: [{
        role: 'user',
        content: `Write a ${opportunity.content_type.replace('_', ' ')} for this business, targeting the keyword "${opportunity.keyword}" in ${opportunity.market || 'their market'}. Write for the customer first, not for search engines — no keyword stuffing. Return ONLY valid JSON with exactly these keys: title (string, 20-65 chars), meta_description (string, 80-160 chars), slug (short url-safe string, no leading/trailing dashes), headings (array of section heading strings, at least 3), sections (array of {heading, text} objects matching the headings, each text 2-4 sentences, specific and useful — not generic filler), faqs (array of {question, answer}, at least 3), cta (short call-to-action string), internal_links (array of short strings describing what to link to), schema_suggestion (short string naming the relevant schema.org type, e.g. "LocalBusiness" or "FAQPage").

Business: ${client.company_name}
Brand voice: ${client.brand_voice || 'professional'}${client.custom_brand_instructions ? ' — ' + client.custom_brand_instructions : ''}
Main offer: ${client.main_offer || 'n/a'}
Conversion goal: ${client.conversion_goal || 'generate a lead'}
Product/service: ${opportunity.product_service || 'n/a'}`,
      }],
    })

    const raw = message.content?.[0]?.text || '{}'
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const draft = JSON.parse(jsonMatch ? jsonMatch[0] : raw)

    const contentRow = {
      client_id: clientId,
      opportunity_id: opportunityId,
      content_type: opportunity.content_type,
      title: draft.title,
      slug: draft.slug ? slugify(draft.slug) : slugify(draft.title),
      meta_description: draft.meta_description,
      body: {
        headings: draft.headings || [],
        sections: draft.sections || [],
        faqs: draft.faqs || [],
        cta: draft.cta || '',
        internal_links: draft.internal_links || [],
        schema_suggestion: draft.schema_suggestion || '',
      },
      status: 'draft',
    }
    contentRow.seo_score = computeSeoScore(contentRow).score

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('content_items').insert(contentRow).select().single()
    if (insertErr) throw insertErr

    await supabaseAdmin.from('opportunities').update({ status: 'published' }).eq('id', opportunityId)
    // Note: "published" here reflects that a content draft was created for
    // this opportunity, not that the page itself is live — the content
    // item's own `status` field tracks draft/approved/scheduled/published.

    res.status(200).json({ content: inserted })
  } catch (err) {
    await supabaseAdmin.from('opportunities').update({ status: 'approved' }).eq('id', opportunityId)
    res.status(500).json({ error: `Generation failed: ${err.message}` })
  }
}
