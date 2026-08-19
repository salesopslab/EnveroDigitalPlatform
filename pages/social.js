// ============================================================
// SOCIAL ENGINE
// Phase 1: UI + structure only. Real OAuth publishing to each
// platform is Phase 2 — connect buttons are disabled with a
// "Coming soon" note per Aaron's own MVP scoping.
// ============================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '../components/AppShell'
import { useRequireSession } from '../lib/useSession'
import { supabase } from '../lib/supabaseClient'

const PLATFORMS = ['Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'YouTube', 'Google Business Profile']

export default function Social() {
  const { client, loading, logout } = useRequireSession()
  const [posts, setPosts] = useState([])

  useEffect(() => {
    if (!client) return
    supabase.from('content_items').select('*').eq('client_id', client.id)
      .in('content_type', ['social_post', 'video_script'])
      .order('updated_at', { ascending: false })
      .then(({ data }) => setPosts(data || []))
  }, [client])

  if (loading || !client) return <div className="container" style={{ paddingTop: 80 }}>Loading...</div>

  return (
    <AppShell client={client} onLogout={logout}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Social</h1>

      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 600, marginBottom: 12 }}>Connected platforms</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {PLATFORMS.map((p) => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }}>
              {p} <span style={{ color: '#9ca3af' }}>· Not connected</span>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} disabled title="Coming soon">Connect</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <p style={{ fontWeight: 600, marginBottom: 12 }}>Generated social content</p>
        {posts.length === 0 ? (
          <p style={{ color: '#6b7280' }}>Use "Multiply" on a piece of content to generate social posts here.</p>
        ) : (
          posts.map((p) => (
            <div key={p.id} style={{ padding: '10px 0', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Link href={`/content/${p.id}`} style={{ fontWeight: 600, color: '#1a1a2e' }}>{p.title || 'Untitled'}</Link>
                <p style={{ fontSize: 13, color: '#6b7280' }}>{p.platform || p.content_type}</p>
              </div>
              <span className={`status-pill status-${p.status}`}>{p.status}</span>
            </div>
          ))
        )}
      </div>
    </AppShell>
  )
}
