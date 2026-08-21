// ============================================================
// Looks up a place's current Google rating + review count via the
// Places API (New) Place Details endpoint. This is a plain Maps
// Platform API key (GOOGLE_MAPS_API_KEY) — separate from the GA4/
// Search Console service account (lib/googleAuth.js), since Places
// API auth works differently (API key, not OAuth/JWT). Self-serve:
// enable "Places API (New)" in Google Cloud Console, create an API
// key restricted to it, enable billing. No manual approval needed
// (unlike the Business Profile APIs).
//
// Only requests rating/userRatingCount/displayName — not the
// `reviews` field (actual review text), which triggers the pricier
// "Enterprise + Atmosphere" SKU. Rating + count alone is enough for
// the dashboard's reputation card and stays on the cheaper tier.
// ============================================================

export async function getPlaceRating(placeId) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return { ok: false, error: 'Google Maps API key not configured (GOOGLE_MAPS_API_KEY).' }

  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,displayName',
      },
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error?.message || `Places API returned ${res.status}` }

    return {
      ok: true,
      rating: typeof data.rating === 'number' ? data.rating : null,
      reviewCount: typeof data.userRatingCount === 'number' ? data.userRatingCount : null,
      mapsUrl: data.googleMapsUri || null,
      name: data.displayName?.text || null,
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}
