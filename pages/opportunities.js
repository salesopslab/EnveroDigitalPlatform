// ============================================================
// OPPORTUNITY ENGINE
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import AppShell from '../components/AppShell'
import { useRequireSession } from '../lib/useSession'
import { supabase } from '../lib/supabaseClient'

export default function Opportunities() {
  const router = useRouter()
  const { client, loading, logout } = useRequireSession()
  const [opportunities, setOpportunities] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [creatingId, setCreatingId] = useState(null)
  const [filters, setFilters] = useState({ product: '', market: '', intent: '', contentType: '' })

  useEffect(() => {
    if (client) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client])

  async function load() {
    setDataLoading(true)
    const { data } = await supabase.from('opportunities').select('*').eq('client_id', client.id).order('opportunity_score', { ascending: false })
    setOpportunities(data || [])
    setDataLoading(false)
  }

  async function generate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/generate-opportunities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await load()
    } catch (err) { alert(err.message) } finally { setGenerating(false) }
  }

  async function approve(id) {
    await supabase.from('opportunities').update({ status: 'approved' }).eq('id', id)
    load()
  }

  async function createContent(id) {
    setCreatingId(id)
    try {
      const res = await fetch('/api/generate-content', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, opportunityId: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await load()
      router.push(`/content/${data.content.id}`)
    } catch (err) { alert(err.message) } finally { setCreatingId(null) }
  }

  const filtered = useMemo(() => opportunities.filter((o) =>
    (!filters.product || (o.product_service || '').toLowerCase().includes(filters.product.toLowerCase())) &&
    (!filters.market || (o.market || '').toLowerCase().includes(filters.market.toLowerCase())) &&
    (!filters.intent || o.search_intent === filters.intent) &&
    (!filters.contentType || o.content_type === filters.contentType)
  ), [opportunities, filters])

  if (loading || !client) return <div className="container" style={{ paddingTop: 80 }}>Loading...</div>

  return (
    <AppShell client={client} onLogout={logout}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 24 }}>Opportunities</h1>
        <button className="btn btn-primary" onClick={generate} disabled={generating}>
          {generating ? 'Generating…' : 'Generate opportunities'}
        </button>
      </div>

      <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <input placeholder="Filter by product" value={filters.product} onChange={(e) => setFilters((f) => ({ ...f, product: e.target.value }))} style={{ marginBottom: 0, maxWidth: 180 }} />
        <input placeholder="Filter by location" value={filters.market} onChange={(e) => setFilters((f) => ({ ...f, market: e.target.value }))} style={{ marginBottom: 0, maxWidth: 180 }} />
        <select value={filters.intent} onChange={(e) => setFilters((f) => ({ ...f, intent: e.target.value }))} style={{ maxWidth: 180 }}>
          <option value="">All intents</option>
          {['informational', 'navigational', 'commercial', 'transactional'].map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select value={filters.contentType} onChange={(e) => setFilters((f) => ({ ...f, contentType: e.target.value }))} style={{ maxWidth: 200 }}>
          <option value="">All content types</option>
          {['blog_article', 'service_page', 'product_page', 'location_page', 'comparison_page', 'faq', 'buying_guide', 'landing_page'].map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
        </select>
      </div>

      {dataLoading ? <p style={{ color: '#6b7280' }}>Loading…</p> : filtered.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No opportunities match. Try generating new ones or clearing filters.</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Keyword</th><th>Type</th><th>Market</th><th>Intent</th><th>Score</th><th>Difficulty</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td>{o.keyword}</td>
                  <td>{o.content_type.replace('_', ' ')}</td>
                  <td>{o.market || '—'}</td>
                  <td>{o.search_intent || '—'}</td>
                  <td>{o.opportunity_score ?? '—'}</td>
                  <td>{o.difficulty ?? '—'}</td>
                  <td><span className={`status-pill status-${o.status}`}>{o.status.replace('_', ' ')}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {o.status === 'new' && <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => approve(o.id)}>Approve</button>}
                    {(o.status === 'approved' || o.status === 'new') && (
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: 12, padding: '6px 10px', marginLeft: 6 }}
                        onClick={() => createContent(o.id)}
                        disabled={creatingId === o.id}
                      >
                        {creatingId === o.id ? 'Creating…' : 'Create content'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  )
}
