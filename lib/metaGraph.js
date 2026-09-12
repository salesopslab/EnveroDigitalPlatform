// ============================================================
// META GRAPH API HELPER
// Shared by pages/api/auth/facebook/callback.js (OAuth token
// exchange) and pages/api/publish-social.js (posting content).
//
// Covers both Facebook Pages and Instagram, since Meta's Graph API
// handles both through the same endpoint family — an Instagram
// Business Account is always linked to a Facebook Page, and IG
// calls are authenticated with that Page's access token, not a
// separate Instagram-specific token.
// ============================================================

const GRAPH_VERSION = 'v21.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

export function metaOAuthDialogUrl({ redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID,
    redirect_uri: redirectUri,
    state,
    // pages_show_list: see which Pages the user manages
    // pages_read_engagement + pages_manage_posts: read/write the Page feed
    // business_management: needed to reliably enumerate Pages for some account types
    // instagram_basic + instagram_content_publish: read + post to the linked IG account
    scope: [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'business_management',
      'instagram_basic',
      'instagram_content_publish',
    ].join(','),
  })
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`
}

async function graphGet(path, params = {}) {
  const url = new URL(`${GRAPH_BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || 'Graph API error')
  return data
}

async function graphPost(path, body) {
  const url = new URL(`${GRAPH_BASE}${path}`)
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || 'Graph API error')
  return data
}

// Exchanges the short-lived OAuth code for a short-lived user token,
// then immediately exchanges that for a long-lived one (~60 days).
// We don't store the user token itself -- only the per-Page tokens
// derived from it below, which for Meta don't expire on their own
// as long as the long-lived user token they came from stays valid.
export async function exchangeCodeForUserToken({ code, redirectUri }) {
  const short = await graphGet('/oauth/access_token', {
    client_id: process.env.FACEBOOK_APP_ID,
    client_secret: process.env.FACEBOOK_APP_SECRET,
    redirect_uri: redirectUri,
    code,
  })

  const long = await graphGet('/oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: process.env.FACEBOOK_APP_ID,
    client_secret: process.env.FACEBOOK_APP_SECRET,
    fb_exchange_token: short.access_token,
  })

  return long.access_token
}

// Returns every Page the user manages, each with its own page-level
// access token (this is what actually gets used for publishing --
// not the user token above).
export async function listManagedPages(userAccessToken) {
  const data = await graphGet('/me/accounts', { access_token: userAccessToken })
  return data.data || []
}

// A Page may have an Instagram Business Account linked to it. Returns
// null if this Page has no IG account connected.
export async function getLinkedInstagramAccount(pageId, pageAccessToken) {
  const data = await graphGet(`/${pageId}`, {
    fields: 'instagram_business_account{id,username}',
    access_token: pageAccessToken,
  })
  return data.instagram_business_account || null
}

export async function publishToFacebookPage({ pageId, pageAccessToken, message }) {
  return graphPost(`/${pageId}/feed`, { message, access_token: pageAccessToken })
}

// Instagram publishing is a two-step process on Meta's API: create a
// media container, then publish it. It ALWAYS requires an image or
// video URL -- there's no text-only post on Instagram. Included here
// for completeness, but see pages/api/publish-social.js for why this
// isn't wired into the UI yet (content generation doesn't produce
// images).
export async function publishToInstagram({ igAccountId, pageAccessToken, imageUrl, caption }) {
  const container = await graphPost(`/${igAccountId}/media`, {
    image_url: imageUrl,
    caption,
    access_token: pageAccessToken,
  })
  return graphPost(`/${igAccountId}/media_publish`, {
    creation_id: container.id,
    access_token: pageAccessToken,
  })
}
