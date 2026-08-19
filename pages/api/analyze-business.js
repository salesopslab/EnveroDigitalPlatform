// ============================================================
// POST /api/analyze-business
// Body: { url }
// Fetches the given URL server-side and asks Claude to suggest
// Business Brain fields from it. Used by the onboarding wizard's
// "Analyze my website" step — suggestions only, the user reviews
// and edits everything before it's saved.
// ============================================================

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { url } = req.body || {}
  if (!url) return res.status(400).json({ error: 'url is required' })

  let pageText = ''
  try {
    const pageRes = await fetch(url, { headers: { 'User-Agent': 'EnveroDigitalBot/1.0' } })
    const html = await pageRes.text()
    // Cheap strip-tags — good enough to hand to Claude as context, no need for a full HTML parser dependency.
    pageText = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12000)
  } catch (err) {
    return res.status(422).json({ error: `Could not fetch ${url}: ${err.message}` })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You're helping fill out a business profile from this company's website text. Based on the content below, suggest values for these fields. Return ONLY valid JSON, no other text, with these exact keys: business_name, industry, description (1-2 sentences), products (array of strings), services (array of strings), locations (array of strings), ideal_customer (1 sentence), main_offer (1 sentence). If you can't confidently infer a field, use an empty string or empty array rather than guessing wildly.

Website text:
${pageText}`,
      }],
    })

    const raw = message.content?.[0]?.text || '{}'
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const suggestions = JSON.parse(jsonMatch ? jsonMatch[0] : raw)

    res.status(200).json({ suggestions })
  } catch (err) {
    res.status(500).json({ error: `Claude request failed: ${err.message}` })
  }
}
