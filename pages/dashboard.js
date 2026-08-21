// ============================================================
// GROWTH DASHBOARD
// ============================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import AppShell from '../components/AppShell'
import { useRequireSession } from '../lib/useSession'
import { supabase } from '../lib/supabaseClient'
import { fetchJson } from '../lib/fetchJson'

const RANGES = [
  { key: 7, label: 'Last 7 days' },
  { key: 30, label: 'Last 30 days' },
  { key: 90, label: 'Last 90 days' },
]

const OPP_BUCKETS = [
  { key: 'high_intent', label: 'High Intent', test: (o) => o.search_intent === 'transactional' },
  { key: 'easy_wins', label: 'Easy Wins', test: (o) => (o.difficulty || 100) <= 35 },
  { key: 'local', label: 'Local Opportunities', test: (o) => Boolean(o.market) },
  { key: 'comparison', label: 'Comparison Content', test: (o) => o.content_type === 'comparison_page' },
  { key: 'faq', label: 'Questions / FAQs', test: (o) => o.content_type === 'faq' },
]

export default function Dashboard() {
  const router = useRouter()
  const { client, session, loading, logout } = useRequireSession()
  const [range, setRange] = useState(30)
  const [leads, setLeads] = useState([])
  const [content, setContent] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [gaData, setGaData] = useState(null)

  useEffect(() => {
    if (!client) return
    if (client.onboarded === false) {
      router.replace('/business-brain')
      return
    }
    loadData()
    loadGoogleAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, range])

  async function loadGoogleAnalytics() {
    try {
      const res = await fetch('/api/google-analytics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, days: range }),
      })
      setGaData(await res.json())
    } catch {
      setGaData({ connected: true, error: 'Could not reach Google Analytics.' })
    }
  }

  async function loadData() {
    setDataLoading(true)
    const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000).toISOString()
    const [{ data: leadRows }, { data: contentRows }, { data: oppRows }] = await Promise.all([
      supabase.from('leads').select('*').eq('client_id', client.id).gte('captured_at', since),
      supabase.from('content_items').select('*').eq('client_id', client.id),
      supabase.from('opportunities').select('*').eq('client_id', client.id).in('status', ['new', 'approved']),
    ])
    setLeads(leadRows || [])
    setContent(contentRows || [])
    setOpportunities(oppRows || [])
    setDataLoading(false)
  }

  async function generateOpportunities() {
    setGenerating(true)
    try {
      await fetchJson('/api/generate-opportunities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      })
      await loadData()
    } catch (err) {
      alert(err.message)
    } finally {
      setGenerating(false)
    }
  }

  if (loading || !client) return <div className="container" style={{ paddingTop: 80 }}>Loading...</div>

  const publishedInRange = content.filter((c) => c.published_at && new Date(c.published_at) >= new Date(Date.now() - range * 86400000))
  const soldLeads = leads.filter((l) => l.status === 'sold')
  const estRevenue = soldLeads.reduce((sum, l) => sum + (Number(l.lead_value) || 0), 0)
  const estLeadValue = leads.length > 0
    ? Math.round((estRevenue || leads.length * (Number(client.approx_customer_value) || 0)) / leads.length)
    : 0
  const conversionRate = content.length > 0 ? ((leads.length / Math.max(publishedInRange.length, 1)) * 100).toFixed(1) : '—'

  const topOpportunities = [...opportunities]
    .sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0))
    .slice(0, 5)

  return (
    <AppShell client={client} onLogout={logout}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26 }}>Welcome{client.company_name ? `, ${client.company_name}` : ''}</h1>
          <p style={{ color: '#6b7280' }}>{session?.user?.email}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`btn ${range === r.key ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 13, padding: '8px 14px' }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 24 }}>
        <StatCard
          label="Organic Visitors"
          value={
            !gaData || !gaData.connected
              ? <Link href="/integrations" style={{ color: '#9ca3af', fontSize: 15 }}>— connect Google Analytics</Link>
              : gaData.error
                ? <span style={{ color: '#9ca3af', fontSize: 14 }}>{gaData.error}</span>
                : gaData.organicUsers.toLocaleString()
          }
          small={!gaData || !gaData.connected || Boolean(gaData.error)}
        />
        <StatCard
          label="Google Rating"
          value={
            !client.google_place_id
              ? <Link href="/integrations" style={{ color: '#9ca3af', fontSize: 15 }}>— connect Google Reviews</Link>
              : client.google_rating != null
                ? `${client.google_rating.toFixed(1)} ★ (${client.google_review_count ?? 0})`
                : <span style={{ color: '#9ca3af', fontSize: 14 }}>Not fetched yet</span>
          }
          small={!client.google_place_id || client.google_rating == null}
        />
        <StatCard label="Leads Generated" value={leads.length} />
        <StatCard label="Content Published" value={publishedInRange.length} />
        <StatCard label="Conversion Rate" value={conversionRate === '—' ? '—' : `${conversionRate}%`} />
        <StatCard label="Estimated Lead Value" value={estLeadValue ? `$${estLeadValue.toLocaleString()}` : '—'} />
        <StatCard label="Estimated Revenue" value={`$${estRevenue.toLocaleString()}`} />
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18 }}>Growth Opportunities</h2>
          <Link href="/opportunities" className="btn btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }}>View Opportunities</Link>
        </div>
        {dataLoading ? <p style={{ color: '#6b7280' }}>Loading…</p> : opportunities.length === 0 ? (
          <div>
            <p style={{ color: '#6b7280', marginBottom: 12 }}>No opportunities yet.</p>
            <button className="btn btn-primary" onClick={generateOpportunities} disabled={generating}>
              {generating ? 'Generating…' : 'Generate opportunities'}
            </button>
          </div>
        ) : (
          <>
            <p style={{ fontWeight: 600, marginBottom: 12 }}>{opportunities.length} opportunities discovered</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {OPP_BUCKETS.map((b) => (
                <div key={b.key} style={{ textAlign: 'center', padding: '12px 8px', background: '#f7f8fa', borderRadius: 8 }}>
                  <p style={{ fontSize: 22, fontWeight: 700 }}>{opportunities.filter(b.test).length}</p>
                  <p style={{ fontSize: 12, color: '#6b7280' }}>{b.label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Recommended Actions</h2>
        {topOpportunities.length === 0 ? (
          <p style={{ color: '#6b7280' }}>Generate opportunities above to get recommendations.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topOpportunities.map((o) => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid #e5e7eb' }}>
                <div>
                  <p style={{ fontWeight: 600 }}>{o.keyword}</p>
                  <p style={{ fontSize: 13, color: '#6b7280' }}>
                    Impact: {o.opportunity_score >= 75 ? 'High' : o.opportunity_score >= 50 ? 'Medium' : 'Low'} ·
                    {' '}Difficulty: {o.difficulty >= 60 ? 'Hard' : o.difficulty >= 30 ? 'Medium' : 'Easy'} ·
                    {' '}{o.content_type.replace('_', ' ')}
                  </p>
                </div>
                <Link href={`/opportunities?highlight=${o.id}`} className="btn btn-primary" style={{ fontSize: 13, padding: '8px 14px' }}>Approve / Create</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function StatCard({ label, value, small }) {
  return (
    <div className="card">
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: small ? 15 : 22, fontWeight: 600, color: small ? '#9ca3af' : 'inherit' }}>{value}</p>
    </div>
  )
}
