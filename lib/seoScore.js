// ============================================================
// RULE-BASED SEO SCORE
// Deliberately not keyword-density-based — checks structure and
// completeness, not how many times a phrase repeats. Returns a
// 0-100 score plus plain-language recommendations for the editor.
// ============================================================

export function computeSeoScore(item) {
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

  return { score, checks }
}
