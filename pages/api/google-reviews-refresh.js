// ============================================================
// POST /api/google-reviews-refresh
// Body: { googlePlaceId }
// Tests a Place ID against the Places API and returns its current
// rating + review count. Used by the Integrations page's "Save &
// Test" button for the Google Reviews card — same pattern as
// /api/google-test-connection: this route only tests the connection
// and never touches the database. The browser client saves the
// result onto the client's own row afterward (through Supabase RLS),
// so this route doesn't need clientId or auth.
// ============================================================

import { getPlaceRating } from '../../lib/googlePlaces'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { googlePlaceId } = req.body || {}
  if (!googlePlaceId) return res.status(400).json({ error: 'googlePlaceId is required' })

  const result = await getPlaceRating(googlePlaceId)
  res.status(200).json(result)
}
