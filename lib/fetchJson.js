// ============================================================
// Wraps fetch() + response parsing for calls to our own /api/*
// routes.
//
// Why this exists: AI-backed routes (generate-opportunities,
// generate-content, multiply-content, analyze-business) call
// Claude and can take longer to respond than Netlify's serverless
// function execution limit. When that happens, Netlify kills the
// function mid-request and returns its own generic HTML error page
// instead of letting our route's own error handling run — even
// though the route's code would have returned a clean JSON error.
// Calling response.json() directly on that HTML throws a cryptic
// "Unexpected token '<', "<HTML>..." is not valid JSON" error,
// which then got dumped straight into a native alert() — confusing
// and alarming for no good reason.
//
// This helper checks the response is actually JSON before parsing
// it, and throws a clear, actionable message when it isn't. It
// doesn't fix the underlying timeout (that needs the AI calls moved
// to a background function with polling — a bigger change), but it
// stops a slow generation from looking like the app is broken.
// ============================================================

export async function fetchJson(url, options) {
  let res
  try {
    res = await fetch(url, options)
  } catch (err) {
    throw new Error('Could not reach the server. Check your connection and try again.')
  }

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(
      res.status === 504 || res.status === 502 || res.status === 503
        ? 'This is taking longer than expected and timed out. Please try again — it often works on a second attempt.'
        : `Something went wrong (server returned ${res.status}). Please try again.`
    )
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}
