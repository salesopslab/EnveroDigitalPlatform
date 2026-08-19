// ============================================================
// BASIC ANALYTICS — Content → Leads → Sales → Revenue
// Traffic is stubbed pending Google Analytics (Phase 2); leads
// and revenue are real, computed from the leads table.
// ============================================================

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { useRequireSession } from '../lib/useSession'
import { supabase } from '../lib/supabaseClient'

export default function Analytics() {
  const { client, loading, logout } = useRequireSession()
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!client) return
    (async () => {
      const [{ data: content }, { data: leads }] = await Promise.all([
        supabase.from('content_items').select('*').eq('client_id', client.id).eq('status', 'published'),
        supabase.from('leads').select('*').eq('client_id', client.id),
      ])
      const combined = (content || []).map((c) => {
        const contentLeads = (leads || []).filter((l) => l.content_item_id === c.id)
        const sold = contentLeads.filter((l) => l.status === 'sold')
        const revenue = sold.reduce((sum, l) => sum + (Number(l.lead_value) || 0), 0)
        return { ...c, leadCount: contentLeads.length, soldCount: sold.length, revenue }
      }).sort((a, b) => b.revenue - a.revenue)
      setRows(combined)
    })()
  }, [client])

  if (loading || !client) return <div className="container" style={{ paddingTop: 80 }}>Loading...</div>

  const topPerformer = rows[0]

  return (
    <AppShell client={client} onLogout={logout}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Analytics</h1>

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
                  <td style={{ color: '#9ca3af' }}>— connect GA</td>
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
