// ============================================================
// SLUGIFY — shared across content slugs and client subdomains
// so both follow the exact same URL-safe formatting rules.
// ============================================================

export function slugify(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
}
