// ============================================================
// SOCIAL ENGINE
// Facebook + Instagram now have a real OAuth connect flow and
// real publishing (see lib/metaGraph.js, pages/api/auth/facebook/*,
// pages/api/publish-social.js). Everything else is still a "Coming
// soon" stub -- each platform needs its own separate app
// registration + review process, done one at a time.
// ============================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import AppShell from '../components/AppShell'
import { useRequireSession } from '../lib/useSession'
import { supabase } from '../lib/supabaseClient'
import { fetchJson } from '../lib/fetchJson'

const BUILT_PLATFORMS = ['facebook', 'instagram']
const COMING_SOON_PLATFORMS = ['LinkedIn', 'TikTok', 'YouTube', 'Google Business Profile']

export default function Social() {
  const router = useRouter()
  const { client, loading, logout } = useRequireSession()
  const [posts, setPosts] = useState([])
  const [connections, setConnections] = useState([])
  const [disconnecting, setDisconnecting] = useState(null)
  const [publishingId, setPublishingId] = useState(null)
  const [publishError, setPublishError] = useState(null)

  async function loadAll() {
    if (!client) return
    const [{ data: postData }, { data: connData }] = await Promise.all([
      supabase.from('content_items').select('*').eq('client_id', client.id)
        .in('content_type', ['social_post', 'video_script'])
        .order('updated_at', { ascending: false }),
      supabase.from('social_connections').select('*').eq('client_id', client.id),
    ])
    setPosts(postData || [])
    setConnections(connData || [])
  }

  useEffect(() => { loadAll() }, [client])

  async function disconnect(platform) {
    setDisconnecting(platform)
    await fetchJson('/api/social-disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: client.id, platform }),
    })
    await loadAll()
    setDisconnecting(null)
  }

  async function publish(postId) {
    setPublishingId(postId)
    setPublishError(null)
    try {
      await fetchJson('/api/publish-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, contentItemId: postId }),
      })
      await loadAll()
    } catch (err) {
      setPublishError({ postId, message: err.message })
    } finally {
      setPublishingId(null)
    }
  }

  if (loading || !client) return <div className="container" style={{ paddingTop: 80 }}>Loading...</div>

  const connectionByPlatform = Object.fromEntries(connections.map((c) => [c.platform, c]))

  return (
    <AppShell client={client} onLogout={logout}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Social</h1>

      {router.query.connected && (
        <p style={{ color: '#166534', fontSize: 14, marginBottom: 16 }}>
          ✓ Connected successfully.
        </p>
      )}
      {router.query.error && (
        <p style={{ color: '#dc2626', fontSize: 14, marginBottom: 16 }}>
          Connection failed: {router.query.error}
        </p>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 600, marginBottom: 12 }}>Connected platforms</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {BUILT_PLATFORMS.map((p) => {
            const conn = connectionByPlatform[p]
            const label = p === 'facebook' ? 'Facebook' : 'Instagram'
            return (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }}>
                {label}
                {conn ? (
                  <>
                    <span style={{ color: '#166534' }}>· Connected as {conn.platform_account_name}</span>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => disconnect(p)}
                      disabled={disconnecting === p}
                    >
                      {disconnecting === p ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ color: '#9ca3af' }}>· Not connected</span>
                    <a href={`/api/auth/facebook/start?clientId=${client.id}`} className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }}>
                      Connect
                    </a>
                  </>
                )}
              </div>
            )
          })}
          {COMING_SOON_PLATFORMS.map((p) => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }}>
              {p} <span style={{ color: '#9ca3af' }}>· Not connected</span>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} disabled title="Coming soon">Connect</button>
            </div>
          ))}
        </div>
        {connectionByPlatform.instagram && (
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 10 }}>
            Instagram is connected, but publishing needs an image on every post — Envero doesn't
            generate images for social content yet, so Instagram posts can't be sent automatically today.
          </p>
        )}
      </div>

      <div className="card">
        <p style={{ fontWeight: 600, marginBottom: 12 }}>Generated social content</p>
        {posts.length === 0 ? (
          <p style={{ color: '#6b7280' }}>Use "Multiply" on a piece of content to generate social posts here.</p>
        ) : (
          posts.map((p) => {
            const isConnected = Boolean(connectionByPlatform[p.platform])
            const canPublish = p.platform === 'facebook' && isConnected && p.status !== 'published'
            return (
              <div key={p.id} style={{ padding: '10px 0', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <Link href={`/content/${p.id}`} style={{ fontWeight: 600, color: '#1a1a2e' }}>{p.title || 'Untitled'}</Link>
                  <p style={{ fontSize: 13, color: '#6b7280' }}>{p.platform || p.content_type}</p>
                  {publishError?.postId === p.id && (
                    <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{publishError.message}</p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`status-pill status-${p.status}`}>{p.status}</span>
                  {canPublish && (
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: 12, padding: '6px 10px' }}
                      onClick={() => publish(p.id)}
                      disabled={publishingId === p.id}
                    >
                      {publishingId === p.id ? 'Publishing…' : 'Publish'}
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </AppShell>
  )
}
