// ============================================================
// CONTENT ENGINE — editor + Content Multiplier
// ============================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import AppShell from '../../components/AppShell'
import { useRequireSession } from '../../lib/useSession'
import { supabase } from '../../lib/supabaseClient'
import { computeSeoScore } from '../../lib/seoScore'
import { fetchJson } from '../../lib/fetchJson'

const MULTIPLIER_OPTIONS = [
  { contentType: 'social_post', platform: 'facebook', label: 'Facebook post' },
  { contentType: 'social_post', platform: 'instagram', label: 'Instagram caption' },
  { contentType: 'social_post', platform: 'linkedin', label: 'LinkedIn post' },
  { contentType: 'video_script', platform: 'tiktok', label: 'TikTok script' },
  { contentType: 'video_script', platform: 'youtube', label: 'YouTube Shorts script' },
  { contentType: 'social_post', platform: 'google_business_profile', label: 'Google Business Profile post' },
  { contentType: 'email', platform: 'email', label: 'Email' },
  { contentType: 'sms', platform: 'sms', label: 'SMS concept' },
]

export default function ContentEditor() {
  const router = useRouter()
  const { id } = router.query
  const { client, loading, logout } = useRequireSession()
  const [item, setItem] = useState(null)
  const [derivatives, setDerivatives] = useState([])
  const [busy, setBusy] = useState(false)
  const [selectedAssets, setSelectedAssets] = useState([])
  const [showMultiplier, setShowMultiplier] = useState(false)

  useEffect(() => {
    if (client && id) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, id])

  async function load() {
    const { data } = await supabase.from('content_items').select('*').eq('id', id).single()
    setItem(data)
    const { data: kids } = await supabase.from('content_items').select('*').eq('parent_content_id', id)
    setDerivatives(kids || [])
  }

  async function setStatus(status) {
    setBusy(true)
    const patch = { status }
    if (status === 'published') patch.published_at = new Date().toISOString()
    await supabase.from('content_items').update(patch).eq('id', id)
    await load()
    setBusy(false)
  }

  async function schedule(dateStr) {
    setBusy(true)
    await supabase.from('content_items').update({ status: 'scheduled', scheduled_at: dateStr }).eq('id', id)
    await load()
    setBusy(false)
  }

  async function improve() {
    // Re-run generation against the same opportunity — a simple, honest
    // "Improve" for Phase 1 rather than a separate diff/merge flow.
    if (!item.opportunity_id) { alert('This item has no linked opportunity to regenerate from.'); return }
    setBusy(true)
    try {
      const data = await fetchJson('/api/generate-content', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, opportunityId: item.opportunity_id }),
      })
      router.push(`/content/${data.content.id}`)
    } catch (err) { alert(err.message) } finally { setBusy(false) }
  }

  async function multiply() {
    if (selectedAssets.length === 0) return
    setBusy(true)
    try {
      const data = await fetchJson('/api/multiply-content', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, contentId: id, assetTypes: selectedAssets }),
      })
      if (data.errors?.length) console.warn(data.errors)
      setShowMultiplier(false)
      setSelectedAssets([])
      await load()
    } catch (err) { alert(err.message) } finally { setBusy(false) }
  }

  if (loading || !client || !item) return <div className="container" style={{ paddingTop: 80 }}>Loading...</div>

  const { score, checks, label } = computeSeoScore(item)

  return (
    <AppShell client={client} onLogout={logout}>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '2 1 480px', minWidth: 320 }}>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>{item.title || 'Untitled'}</h1>
          <p style={{ color: '#6b7280', marginBottom: 20 }}>{item.content_type.replace('_', ' ')} · <span className={`status-pill status-${item.status}`}>{item.status}</span></p>

          <div className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>Meta description</p>
            <p style={{ color: '#374151' }}>{item.meta_description || '—'}</p>
          </div>

          {(item.body?.sections || []).map((s, i) => (
            <div key={i} className="card" style={{ marginBottom: 12 }}>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>{s.heading}</p>
              <p style={{ color: '#374151' }}>{s.text}</p>
            </div>
          ))}

          {item.body?.text && (
            <div className="card" style={{ marginBottom: 12 }}>
              <p style={{ color: '#374151', whiteSpace: 'pre-wrap' }}>{item.body.text}</p>
            </div>
          )}

          {(item.body?.faqs || []).length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <p style={{ fontWeight: 600, marginBottom: 10 }}>FAQs</p>
              {item.body.faqs.map((f, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{f.question}</p>
                  <p style={{ color: '#6b7280', fontSize: 14 }}>{f.answer}</p>
                </div>
              ))}
            </div>
          )}

          {item.body?.cta && (
            <div className="card" style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}>
              <p style={{ fontWeight: 600 }}>Call to action: {item.body.cta}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={improve} disabled={busy}>Improve</button>
            {item.status === 'draft' && <button className="btn btn-primary" onClick={() => setStatus('approved')} disabled={busy}>Approve</button>}
            {item.status === 'approved' && (
              <input type="datetime-local" onChange={(e) => e.target.value && schedule(new Date(e.target.value).toISOString())} style={{ marginBottom: 0, maxWidth: 220 }} />
            )}
            {(item.status === 'approved' || item.status === 'scheduled') && <button className="btn btn-primary" onClick={() => setStatus('published')} disabled={busy}>Publish</button>}
            <button className="btn btn-secondary" onClick={() => setShowMultiplier((v) => !v)}>Multiply</button>
          </div>

          {showMultiplier && (
            <div className="card" style={{ marginTop: 16 }}>
              <p style={{ fontWeight: 600, marginBottom: 10 }}>Select assets to generate</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 8, marginBottom: 12 }}>
                {MULTIPLIER_OPTIONS.map((opt) => {
                  const checked = selectedAssets.some((a) => a.contentType === opt.contentType && a.platform === opt.platform)
                  return (
                    <label key={opt.label} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                      <input type="checkbox" checked={checked} onChange={() => {
                        setSelectedAssets((prev) => checked
                          ? prev.filter((a) => !(a.contentType === opt.contentType && a.platform === opt.platform))
                          : [...prev, opt])
                      }} />
                      {opt.label}
                    </label>
                  )
                })}
              </div>
              <button className="btn btn-primary" onClick={multiply} disabled={busy || selectedAssets.length === 0}>
                {busy ? 'Generating…' : `Generate ${selectedAssets.length || ''} asset${selectedAssets.length === 1 ? '' : 's'}`}
              </button>
            </div>
          )}

          {derivatives.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <p style={{ fontWeight: 600, marginBottom: 10 }}>Generated derivatives</p>
              {derivatives.map((d) => (
                <div key={d.id} style={{ padding: '8px 0', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{d.title} <span style={{ color: '#9ca3af', fontSize: 13 }}>({d.platform || d.content_type})</span></span>
                  <span className={`status-pill status-${d.status}`}>{d.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: '1 1 260px', minWidth: 240 }}>
          <div className="card">
            <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
            <p style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>{score}/100</p>
            {checks.map((c) => (
              <div key={c.label} style={{ display: 'flex', gap: 8, marginBottom: 10, fontSize: 13 }}>
                <span style={{ color: c.pass ? '#16a34a' : '#dc2626' }}>{c.pass ? '✓' : '!'}</span>
                <div><strong>{c.label}</strong><br /><span style={{ color: '#6b7280' }}>{c.detail}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
