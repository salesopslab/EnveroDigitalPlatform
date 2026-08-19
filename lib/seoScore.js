// ============================================================
// RULE-BASED SEO SCORE
// Deliberately not keyword-density-based — checks structure and
// completeness, not how many times a phrase repeats. Returns a
// 0-100 score plus plain-language recommendations for the editor.
//
// This full rubric (headings, FAQs, meta description, internal
// links) only makes sense for long-form SEO content — the assets
// Content Multiplier generates (social posts, video scripts,
// email, sms) only ever get { text, cta } in `body` (see
// pages/api/multiply-content.js), so scoring them against the same
// checklist always bottoms out around title+CTA regardless of how
// good the copy actually is. Those types get a separate, smaller
// "Quality Score" rubric instead.
// ============================================================

const SEO_CONTENT_TYPES = [
  'blog_article', 'service_page', 'product_page', 'location_page',
  'comparison_page', 'faq', 'buying_guide', 'landing_page',
]

export function computeSeoScore(item) {
  if (!SEO_CONTENT_TYPES.includes(item.content_type)) {
    return computeQualityScore(item)
  }

  const checks = []
  const body = item.body || {}

  const title = item.title || ''
  checks.push({
    label: 'Title',
    pass: title.length >= 20 && title.length <= 65,
    detail: title.length === 0
      ? 'Add a title.'
      : title.length < 20
        ? 'Title is short — customers may not get enough context from search results.'
        : title.length > 65
          ? 'Title is long and may get cut off in search results.'
          : 'Title length looks good.',
  })

  const meta = item.meta_description || ''
  checks.push({
    label: 'Meta description',
    pass: meta.length >= 80 && meta.length <= 160,
    detail: meta.length === 0
      ? 'Add a meta description.'
      : meta.length < 80
        ? 'Meta description is short — add more detail to earn clicks.'
        : meta.length > 160
          ? 'Meta description is long and may get truncated.'
          : 'Meta description length looks good.',
  })

  const headings = Array.isArray(body.headings) ? body.headings : []
  checks.push({
    label: 'Headings',
    pass: headings.length >= 2,
    detail: headings.length >= 2
      ? 'Page is broken into clear sections.'
      : 'Add more section headings so the page is easy to scan.',
  })

  const faqs = Array.isArray(body.faqs) ? body.faqs : []
  checks.push({
    label: 'FAQs',
    pass: faqs.length >= 2,
    detail: faqs.length >= 2
      ? 'Answers common customer questions.'
      : 'Add a couple of FAQs — these often show up directly in search results.',
  })

  const hasCta = Boolean(body.cta)
  checks.push({
    label: 'Call to action',
    pass: hasCta,
    detail: hasCta ? 'Has a clear next step for the customer.' : 'Add a clear call to action.',
  })

  const internalLinks = Array.isArray(body.internal_links) ? body.internal_links : []
  checks.push({
    label: 'Internal links',
    pass: internalLinks.length >= 1,
    detail: internalLinks.length >= 1
      ? 'Links to other relevant pages.'
      : 'Link to at least one other relevant page on the site.',
  })

  const bodyText = (Array.isArray(body.sections) ? body.sections : [])
    .map((s) => (typeof s === 'string' ? s : s?.text || '')).join(' ')
  checks.push({
    label: 'Unique value',
    pass: bodyText.split(/\s+/).filter(Boolean).length >= 150,
    detail: bodyText.split(/\s+/).filter(Boolean).length >= 150
      ? 'Has enough unique content to be useful on its own, not just a template with the city swapped.'
      : 'Page is thin — add specific, useful information so it stands on its own rather than reading like a template.',
  })

  const passed = checks.filter((c) => c.pass).length
  const score = Math.round((passed / checks.length) * 100)

  return { score, checks, label: 'SEO Score' }
}

// Short-form derivatives (social posts, video scripts, email, sms) — these
// aren't indexed for search, so "SEO Score" isn't the right framing. Judge
// them on whether the copy is complete and usable instead.
function computeQualityScore(item) {
  const checks = []
  const body = item.body || {}

  const title = item.title || ''
  checks.push({
    label: 'Title',
    pass: title.length > 0,
    detail: title.length > 0 ? 'Has a reference title.' : 'Add a title.',
  })

  const text = body.text || ''
  const wordCount = text.split(/\s+/).filter(Boolean).length
  checks.push({
    label: 'Copy',
    pass: wordCount >= 15,
    detail: wordCount === 0
      ? 'No copy generated yet.'
      : wordCount < 15
        ? 'Copy is very short — may read as thin or unfinished.'
        : 'Has enough copy to stand on its own.',
  })

  const hasCta = Boolean(body.cta)
  checks.push({
    label: 'Call to action',
    pass: hasCta,
    detail: hasCta ? 'Has a clear next step for the customer.' : 'Add a clear call to action.',
  })

  const passed = checks.filter((c) => c.pass).length
  const score = Math.round((passed / checks.length) * 100)

  return { score, checks, label: 'Quality Score' }
}
