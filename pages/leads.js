// ============================================================
// LEAD CENTER
// ============================================================

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { useRequireSession } from '../lib/useSession'
import { supabase } from '../lib/supabaseClient'
import { fetchJson } from '../lib/fetchJson'

const STATUSES = ['new', 'contacted', 'qualified', 'appointment', 'sold', 'lost']

export default function Leads() {
  const { client, loading, logout } = useRequireSession()
  const [leads, setLeads] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [requestingId, setRequestingId] = useState(null)

  useEffect(() => {
    if (!client) return
    supabase.from('leads').select('*').eq('client_id', client.id).order('captured_at', { ascending: false })
      .then(({ data }) => setLeads(data || []))
  }, [client])

  async function updateLead(id, patch) {
    const prevLead = leads.find((l) => l.id === id)
    const becameSold = patch.status === 'sold' && prevLead?.status !== 'sold'
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    await supabase.from('leads').update(patch).eq('id', id)
    // Auto-fire a review request the moment a lead becomes "sold" — same
    // neutral message every time (see /api/review-request), no filtering.
    if (becameSold) requestReview(id, { silent: true })
  }

  async function requestReview(id, { silent } = {}) {
    setRequestingId(id)
    try {
      await fetchJson('/api/review-request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, leadId: id }),
      })
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, review_requested_at: new Date().toISOString() } : l)))
    } catch (err) {
      if (!silent) alert(err.message)
    } finally {
      setRequestingId(null)
    }
  }

  if (loading || !client) return <div className="container" style={{ paddingTop: 80 }}>Loading...</div>

  const filtered = statusFilter ? leads.filter((l) => l.status === statusFilter) : leads

  return (
    <AppShell client={client} onLogout={logout}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 24 }}>Leads</h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No leads yet. Leads captured from your published pages will show up here.</p>
      ) : (
        <>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
            Review requests always send the same neutral message to whoever they're sent to — Google's
            policies prohibit filtering who gets asked based on how happy they seemed.
          </p>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead><tr><th>Name</th><th>Contact</th><th>Source</th><th>Value</th><th>Status</th><th>SMS OK</th><th>Notes</th><th>Review</th></tr></thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id}>
                    <td>{l.name || '—'}</td>
                    <td>{l.email}{l.phone ? ` · ${l.phone}` : ''}</td>
                    <td>{l.product_service || '—'}{l.location ? ` · ${l.location}` : ''}</td>
                    <td>
                      <input
                        type="number"
                        value={l.lead_value ?? ''}
                        onChange={(e) => updateLead(l.id, { lead_value: e.target.value ? Number(e.target.value) : null })}
                        style={{ marginBottom: 0, width: 90, padding: '6px 8px', fontSize: 13 }}
                      />
                    </td>
                    <td>
                      <select value={l.status} onChange={(e) => updateLead(l.id, { status: e.target.value })} style={{ fontSize: 13, padding: '6px 8px' }}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(l.sms_consent)}
                        disabled={!l.phone}
                        title={l.phone ? 'Customer consented to receive SMS' : 'No phone number on file'}
                        onChange={(e) => updateLead(l.id, { sms_consent: e.target.checked })}
                      />
                    </td>
                    <td>
                      <input
                        value={l.notes || ''}
                        onChange={(e) => updateLead(l.id, { notes: e.target.value })}
                        style={{ marginBottom: 0, fontSize: 13, padding: '6px 8px' }}
                      />
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: 12, padding: '6px 10px' }}
                        onClick={() => requestReview(l.id)}
                        disabled={requestingId === l.id || (!l.email && !l.phone)}
                        title={!l.email && !l.phone ? 'No email or phone on file' : ''}
                      >
                        {requestingId === l.id ? 'Sending…' : l.review_requested_at ? 'Resend' : 'Request review'}
                      </button>
                      {l.review_requested_at && (
                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                          Sent {new Date(l.review_requested_at).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  )
}
