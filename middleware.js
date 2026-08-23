// ============================================================
// MIDDLEWARE — maps a client's real subdomain to their content
//
// A request to nationalcardeals.enverodigital.com/some-article
// gets rewritten internally to /p/nationalcardeals/some-article,
// which pages/p/[subdomain]/[slug].js already knows how to render.
// The visitor never sees the rewrite — their browser bar still
// shows the subdomain.
//
// This only fires for actual subdomains of enverodigital.com (not
// www, not the apex domain itself, not netlify.app) so it never
// touches the main app (dashboard, login, etc.), which stays on
// the apex domain as before.
//
// Requires: Netlify has *.enverodigital.com routed to this site
// (a wildcard domain alias) — see Settings > Domain management.
// Custom domains (a client's own domain, e.g. nationalcardeals.com)
// are NOT handled here yet; that needs each domain added as its
// own Netlify domain alias, which isn't automated yet.
// ============================================================

import { NextResponse } from 'next/server'

const ROOT_DOMAIN = 'enverodigital.com'

export function middleware(req) {
  const hostname = (req.headers.get('host') || '').split(':')[0].toLowerCase()

  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const subdomain = hostname.slice(0, -(`.${ROOT_DOMAIN}`.length))

    if (subdomain && subdomain !== 'www') {
      const url = req.nextUrl.clone()
      url.pathname = `/p/${subdomain}${url.pathname}`
      return NextResponse.rewrite(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  // Skip Next internals, API routes, and static files — only rewrite
  // actual page requests.
  matcher: ['/((?!_next|api|favicon.ico|.*\\.).*)'],
}
