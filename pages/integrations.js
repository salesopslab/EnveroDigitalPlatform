// ============================================================
// INTEGRATIONS
// Google Analytics + Search Console are real (Phase 2, shared
// service account model — see lib/googleAuth.js). Lead Webhook is
// also real (Phase 2, generic outbound webhook — see
// lib/webhookDelivery.js) rather than a bespoke per-CRM integration.
// Everything else is still a Phase 3 placeholder.
// ============================================================

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { useRequireSession } from '../lib/useSession'
import { supabase } from '../lib/supabaseClient'
import { fetchJson } from '../lib/fetchJson'

const COMING_SOON = [
  { name: 'Google Business Profile', desc: 'Publish posts directly' },
  { name: 'WordPress / CMS', desc: 'Publish generated pages to your own site' },
]

const SERVICE_ACCOUNT_EMAIL = process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL || '(not configured)'

export default function Integrations() {
  const { client, loading, logout, reloadClient, session } = useRequireSession()
  const [ga4PropertyId, setGa4PropertyId] = useState('')
  const [gscSiteUrl, setGscSiteUrl] = useState('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState(null)

  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSaving, setWebhookSaving] = useState(false)
  const [webhookResult, setWebhookResult] = useState(null)
  const [deliveries, setDeliveries] = useState([])

  const [placeId, setPlaceId] = useState('')
  const [placeSaving, setPlaceSaving] = useState(false)
  const [placeResult, setPlaceResult] = useState(null)

  useEffect(() => {
    if (!client) return
    setGa4PropertyId(client.ga4_property_id || '')
    setGscSiteUrl(client.gsc_site_url || '')
    setWebhookUrl(client.lead_webhook_url || '')
    setPlaceId(client.google_place_id || '')
    loadDeliveries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client])

  async function loadDeliveries() {
    const { data } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('client_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    setDeliveries(data || [])
  }

  async function saveAndTestWebhook() {
    setWebhookSaving(true)
    setWebhookResult(null)
    try {
      await supabase.from('clients').update({ lead_webhook_url: webhookUrl || null }).eq('id', session.user.id)
      await reloadClient(session.user.id)

      if (webhookUrl) {
        const res = await fetch('/api/webhook-test', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: session.user.id }),
        })
        setWebhookResult(await res.json())
        await loadDeliveries()
      }
    } catch (err) {
      setWebhookResult({ error: err.message })
    } finally {
      setWebhookSaving(false)
    }
  }

  async function saveAndTestPlace() {
    setPlaceSaving(true)
    setPlaceResult(null)
    try {
      if (!placeId) {
        await supabase.from('clients').update({
          google_place_id: null, google_business_name: null,
          google_rating: null, google_review_count: null, google_rating_updated_at: null,
        }).eq('id', session.user.id)
        await reloadClient(session.user.id)
        setPlaceResult({ ok: true, cleared: true })
        return
      }

      const data = await fetchJson('/api/google-reviews-refresh', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googlePlaceId: placeId }),
      })
      setPlaceResult(data)
      if (data.ok) {
        await supabase.from('clients').update({
          google_place_id: placeId,
          google_business_name: data.name || null,
          google_rating: data.rating,
          google_review_count: data.reviewCount,
          google_rating_updated_at: new Date().toISOString(),
        }).eq('id', session.user.id)
        await reloadClient(session.user.id)
      }
    } catch (err) {
      setPlaceResult({ ok: false, error: err.message })
    } finally {
      setPlaceSaving(false)
    }
  }

  async function copyReviewLink() {
    const link = `https://search.google.com/local/writereview?placeid=${client.google_place_id}`
    try {
      await navigator.clipboard.writeText(link)
      setPlaceResult((prev) => ({ ...prev, copied: true }))
    } catch {
      // clipboard API unavailable — the link is shown below regardless
    }
  }

  async function saveAndTest() {
    setTesting(true)
    setResult(null)
    try {
      const res = await fetch('/api/google-test-connection', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ga4PropertyId: ga4PropertyId || undefined, gscSiteUrl: gscSiteUrl || undefined }),
      })
      const data = await res.json()
      setResult(data)

      // Save whichever fields tested ok (or were left blank — clearing a
      // field is a valid save too).
      const patch = {}
      if (!ga4PropertyId || data.ga4?.ok) patch.ga4_property_id = ga4PropertyId || null
      if (!gscSiteUrl || data.gsc?.ok) patch.gsc_site_url = gscSiteUrl || null
      if (Object.keys(patch).length > 0) {
        await supabase.from('clients').update(patch).eq('id', session.user.id)
        await reloadClient(session.user.id)
      }
    } catch (err) {
      setResult({ error: err.message })
    } finally {
      setTesting(false)
    }
  }

  if (loading || !client) return <div className="container" style={{ paddingTop: 80 }}>Loading...</div>

  return (
    <AppShell client={client} onLogout={logout}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Integrations</h1>
      <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>
        Grant <strong>{SERVICE_ACCOUNT_EMAIL}</strong> Viewer access in GA4 (Admin → Property Access Management)
        and as a user in Search Console (Settings → Users and permissions), then connect below.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 12 }}>
        <div className="card">
          <p style={{ fontWeight: 600, marginBottom: 6 }}>Google Analytics</p>
          <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>Real organic visitor counts on the dashboard</p>
          <label className="field-label">GA4 Property ID</label>
          <input
            value={ga4PropertyId}
            onChange={(e) => setGa4PropertyId(e.target.value)}
            placeholder="e.g. 123456789 or properties/123456789"
          />
          {client.ga4_property_id && !result && <p style={{ fontSize: 12, color: '#166534' }}>Connected ✓</p>}
          {result?.ga4 && (
            <p style={{ fontSize: 12, color: result.ga4.ok ? '#166534' : '#dc2626' }}>
              {result.ga4.ok ? 'Connected ✓' : result.ga4.error}
            </p>
          )}
        </div>

        <div className="card">
          <p style={{ fontWeight: 600, marginBottom: 6 }}>Google Search Console</p>
          <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>Import real ranking + impression data</p>
          <label className="field-label">Site URL</label>
          <input
            value={gscSiteUrl}
            onChange={(e) => setGscSiteUrl(e.target.value)}
            placeholder="https://yourbusiness.com/ or sc-domain:yourbusiness.com"
          />
          {client.gsc_site_url && !result && <p style={{ fontSize: 12, color: '#166534' }}>Connected ✓</p>}
          {result?.gsc && (
            <p style={{ fontSize: 12, color: result.gsc.ok ? '#166534' : '#dc2626' }}>
              {result.gsc.ok ? 'Connected ✓' : result.gsc.error}
            </p>
          )}
        </div>
      </div>

      <button className="btn btn-primary" onClick={saveAndTest} disabled={testing} style={{ marginBottom: 24 }}>
        {testing ? 'Testing…' : 'Save & Test'}
      </button>

      <div className="card" style={{ marginBottom: 24, maxWidth: 560 }}>
        <p style={{ fontWeight: 600, marginBottom: 6 }}>Lead Webhook (CRM / Email / SMS)</p>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>
          Sends every new lead as JSON to one URL the instant it's captured — point it at a Zapier
          "Catch Hook", Make, your CRM's inbound webhook trigger, or your own endpoint. Works with
          any tool, no per-CRM setup needed on our end.
        </p>
        <label className="field-label">Webhook URL</label>
        <input
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://hooks.zapier.com/hooks/catch/..."
        />
        <button className="btn btn-primary" onClick={saveAndTestWebhook} disabled={webhookSaving} style={{ marginTop: 12 }}>
          {webhookSaving ? 'Testing…' : 'Save & Test'}
        </button>
        {client.lead_webhook_url && !webhookResult && <p style={{ fontSize: 12, color: '#166534', marginTop: 8 }}>Connected ✓</p>}
        {webhookResult && (
          <p style={{ fontSize: 12, color: webhookResult.success ? '#166534' : '#dc2626', marginTop: 8 }}>
            {webhookResult.success
              ? 'Test event delivered ✓'
              : webhookResult.error || 'Delivery failed'}
          </p>
        )}

        {deliveries.length > 0 && (
          <div style={{ marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Recent deliveries</p>
            {deliveries.map((d) => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', color: d.success ? '#166534' : '#dc2626' }}>
                <span>{d.event}{d.status_code ? ` · ${d.status_code}` : ''}{d.error ? ` · ${d.error}` : ''}</span>
                <span style={{ color: '#9ca3af' }}>{new Date(d.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 24, maxWidth: 560 }}>
        <p style={{ fontWeight: 600, marginBottom: 6 }}>Google Reviews</p>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>
          Powers review request campaigns (email/SMS on <a href="/leads">Leads</a>) and the Google
          Rating card on your dashboard. Find your Place ID with Google's{' '}
          <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noreferrer">Place ID Finder</a>.
        </p>
        <label className="field-label">Google Place ID</label>
        <input
          value={placeId}
          onChange={(e) => setPlaceId(e.target.value)}
          placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4"
        />
        <button className="btn btn-primary" onClick={saveAndTestPlace} disabled={placeSaving} style={{ marginTop: 12 }}>
          {placeSaving ? 'Testing…' : 'Save & Test'}
        </button>

        {client.google_place_id && !placeResult && (
          <p style={{ fontSize: 12, color: '#166534', marginTop: 8 }}>
            Connected ✓{client.google_rating != null ? ` — ${client.google_rating.toFixed(1)} ★ (${client.google_review_count ?? 0} reviews)` : ''}
          </p>
        )}
        {placeResult && (
          <p style={{ fontSize: 12, color: placeResult.ok ? '#166534' : '#dc2626', marginTop: 8 }}>
            {placeResult.ok
              ? placeResult.cleared
                ? 'Cleared.'
                : `Connected ✓ — ${placeResult.rating != null ? placeResult.rating.toFixed(1) : '—'} ★ (${placeResult.reviewCount ?? 0} reviews)`
              : placeResult.error}
          </p>
        )}

        {client.google_place_id && (
          <button
            className="btn btn-secondary"
            style={{ marginTop: 12, fontSize: 12, padding: '6px 10px' }}
            onClick={copyReviewLink}
          >
            {placeResult?.copied ? 'Copied ✓' : 'Copy review link'}
          </button>
        )}

        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>
          Every review request sends the identical neutral message to whoever it's sent to — Google's
          policies prohibit filtering who gets asked based on how happy they seemed.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {COMING_SOON.map((i) => (
          <div key={i.name} className="card">
            <p style={{ fontWeight: 600, marginBottom: 6 }}>{i.name}</p>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>{i.desc}</p>
            <button className="btn btn-secondary" disabled title="Coming soon">Coming soon</button>
          </div>
        ))}
      </div>
    </AppShell>
  )
}
