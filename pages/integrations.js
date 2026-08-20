// ============================================================
// INTEGRATIONS
// Google Analytics + Search Console are real (Phase 2, shared
// service account model — see lib/googleAuth.js). Everything
// else is still a Phase 3 placeholder.
// ============================================================

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { useRequireSession } from '../lib/useSession'
import { supabase } from '../lib/supabaseClient'

const COMING_SOON = [
  { name: 'Google Business Profile', desc: 'Publish posts directly' },
  { name: 'WordPress / CMS', desc: 'Publish generated pages to your own site' },
  { name: 'CRM', desc: 'Sync leads to your sales pipeline' },
  { name: 'Email / SMS', desc: 'Send generated email and SMS content' },
]

const SERVICE_ACCOUNT_EMAIL = process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL || '(not configured)'

export default function Integrations() {
  const { client, loading, logout, reloadClient, session } = useRequireSession()
  const [ga4PropertyId, setGa4PropertyId] = useState('')
  const [gscSiteUrl, setGscSiteUrl] = useState('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!client) return
    setGa4PropertyId(client.ga4_property_id || '')
    setGscSiteUrl(client.gsc_site_url || '')
  }, [client])

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
