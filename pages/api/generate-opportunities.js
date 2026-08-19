// ============================================================
// POST /api/generate-opportunities
// Body: { clientId }
// Loads the client's Business Brain + vertical playbook, asks
// Claude to brainstorm opportunity rows, and inserts them as
// status "new" for the user to review/approve on /opportunities.
// ============================================================

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CONTENT_TYPES = [
  'blog_article', 'service_page', 'product_page', 'location_page',
  'comparison_page', 'faq', 'buying_guide', 'landing_page', 'social_post', 'video_script',
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { clientId } = req.body || {}
  if (!clientId) return res.status(400).json({ error: 'clientId is required' })

  const { data: client, error: clientErr } = await supabaseAdmin
    .from('clients').select('*').eq('id', clientId).single()
  if (clientErr || !client) return res.status(404).json({ error: 'Client not found' })

  const { data: playbook } = await supabaseAdmin
    .from('vertical_playbooks').select('*').eq('industry', client.industry).single()

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Brainstorm 8 content/SEO opportunities for this business. Return ONLY a JSON array, no other text. Each item must have exactly these keys: keyword (string), search_intent (one of informational|navigational|commercial|transactional), content_type (one of ${CONTENT_TYPES.join('|')}), funnel_stage (one of top|middle|bottom), market (string, a specific city/region relevant to this business — use one of the service areas if given), product_service (string), difficulty (integer 1-100, higher = harder to rank), opportunity_score (integer 1-100, higher = better opportunity).

Business: ${client.company_name}
Industry: ${client.industry || 'unknown'}
Description: ${client.description || 'n/a'}
Products: ${JSON.stringify(client.products || [])}
Services: ${JSON.stringify(client.services || [])}
Service areas: ${JSON.stringify(client.service_areas || [])}
Ideal customer: ${client.ideal_customer || 'n/a'}
Typical content types for this vertical: ${JSON.stringify(playbook?.content_types || [])}
Common customer questions in this vertical: ${JSON.stringify(playbook?.common_questions || [])}

Avoid generic thin ideas that only swap a city name with no real differentiation.`,
      }],
    })

    const raw = message.content?.[0]?.text || '[]'
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    const ideas = JSON.parse(jsonMatch ? jsonMatch[0] : raw)

    const rows = ideas.map((idea) => ({ ...idea, client_id: clientId, status: 'new' }))
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('opportunities').insert(rows).select()
    if (insertErr) throw insertErr

    res.status(200).json({ opportunities: inserted })
  } catch (err) {
    res.status(500).json({ error: `Generation failed: ${err.message}` })
  }
}
