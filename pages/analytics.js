// ============================================================
// BASIC ANALYTICS — Content → Leads → Sales → Revenue
// Leads/revenue are real (Supabase). Site-wide traffic is real
// too, via Search Console. Per-content-item traffic stays stubbed
// until generated content is published as real crawlable pages
// (Phase 3 subdomain routing) — see pages/api/google-search-console.js.
// ============================================================

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { useRequireSession } from '../lib/useSession'
import { supabase } from '../lib/supabaseClient'

export default function Analytics() {
  const { client, loading, logout } = useRequireSession()
  const [rows, setRows] = useState([])
  const [gscData, setGscData] = useState(null)

  useEffect(() => {
    if (!client) return
    (async () => {
      const [{ data: content }, { data: leads }, { data: clicks }] = await Promise.all([
        supabase.from('content_items').select('*').eq('client_id', client.id).eq('status', 'published'),
        supabase.from('leads').select('*').eq('client_id', client.id),
        supabase.from('outbound_clicks').select('content_item_id').eq('client_id', client.id),
      ])
      const clickCounts = {}
      ;(clicks || []).forEach((c) => {
        if (!c.content_item_id) return
        clickCounts[c.content_item_id] = (clickCounts[c.content_item_id] || 0) + 1
      })
      const combined = (content || []).map((c) => {
        const contentLeads = (leads || []).filter((l) => l.content_item_id === c.id)
        const sold = contentLeads.filter((l) => l.status === 'sold')
        const revenue = sold.reduce((sum, l) => sum + (Number(l.lead_value) || 0), 0)
        return { ...c, leadCount: contentLeads.length, soldCount: sold.length, revenue, clickCount: clickCounts[c.id] || 0 }
      }).sort((a, b) => b.revenue - a.revenue)
      setRows(combined)
    })()

    fetch('/api/google-search-console', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: client.id, days: 30 }),
    }).then((r) => r.json()).then(setGscData).catch(() => setGscData({ connected: true, error: 'Could not reach Search Console.' }))
  }, [client])

  if (loading || !client) return <div className="container" style={{ paddingTop: 80 }}>Loading...</div>

  const topPerformer = rows[0]

  return (
    <AppShell client={client} onLogout={logout}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Analytics</h1>

      {gscData?.connected && !gscData.error && (
        <div className="card" style={{ marginBottom: 20 }}>
          <p style={{ fontWeight: 600, marginBottom: 12 }}>Site-wide search performance (last 30 days, via Search Console)</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            <MiniStat label="Clicks" value={gscData.clicks.toLocaleString()} />
            <MiniStat label="Impressions" value={gscData.impressions.toLocaleString()} />
            <MiniStat label="Avg. CTR" value={`${(gscData.ctr * 100).toFixed(1)}%`} />
            <MiniStat label="Avg. Position" value={gscData.position.toFixed(1)} />
          </div>
        </div>
      )}
      {gscData?.connected && gscData.error && (
        <div className="card" style={{ marginBottom: 20 }}>
          <p style={{ color: '#9ca3af', fontSize: 13 }}>Search Console: {gscData.error}</p>
        </div>
      )}

      {topPerformer && topPerformer.revenue > 0 && (
        <div className="card" style={{ marginBottom: 20, background: '#eef2ff', border: '1px solid #c7d2fe' }}>
          <p style={{ fontWeight: 600 }}>
            "{topPerformer.title}" is your top performer — {topPerformer.leadCount} leads, ${topPerformer.revenue.toLocaleString()} in revenue.
            Consider creating similar content for other markets.
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <p style={{ color: '#6b7280' }}>Publish some content to start seeing attribution here.</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Content</th><th>Traffic</th><th>Leads</th><th>Sales</th><th>Revenue</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.title || 'Untitled'}</td>
                  <td style={{ color: r.clickCount > 0 ? undefined : '#9ca3af' }}>
                    {r.clickCount > 0
                      ? `${r.clickCount.toLocaleString()} click${r.clickCount === 1 ? '' : 's'}`
                      : r.lander_url
                        ? '0 clicks'
                        : '—'}
                  </td>
                  <td>{r.leadCount}</td>
                  <td>{r.soldCount}</td>
                  <td>${r.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  )
}

function MiniStat({ label, value }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 8px', background: '#f7f8fa', borderRadius: 8 }}>
      <p style={{ fontSize: 20, fontWeight: 700 }}>{value}</p>
      <p style={{ fontSize: 12, color: '#6b7280' }}>{label}</p>
    </div>
  )
}
