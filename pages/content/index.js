// ============================================================
// CONTENT ENGINE — list
// ============================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '../../components/AppShell'
import { useRequireSession } from '../../lib/useSession'
import { supabase } from '../../lib/supabaseClient'

export default function ContentList() {
  const { client, loading, logout } = useRequireSession()
  const [items, setItems] = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!client) return
    supabase.from('content_items').select('*').eq('client_id', client.id).order('updated_at', { ascending: false })
      .then(({ data }) => { setItems(data || []); setDataLoading(false) })
  }, [client])

  if (loading || !client) return <div className="container" style={{ paddingTop: 80 }}>Loading...</div>

  return (
    <AppShell client={client} onLogout={logout}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Content</h1>
      {dataLoading ? <p style={{ color: '#6b7280' }}>Loading…</p> : items.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No content yet — create some from the <Link href="/opportunities" style={{ color: '#4f46e5' }}>Opportunities</Link> page.</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Title</th><th>Type</th><th>SEO Score</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>{c.title || <em style={{ color: '#9ca3af' }}>Untitled</em>}</td>
                  <td>{c.content_type.replace('_', ' ')}{c.platform ? ` · ${c.platform}` : ''}</td>
                  <td>{c.seo_score != null ? `${c.seo_score}/100` : '—'}</td>
                  <td><span className={`status-pill status-${c.status}`}>{c.status}</span></td>
                  <td><Link href={`/content/${c.id}`} className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 10px' }}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  )
}
