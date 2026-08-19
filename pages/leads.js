// ============================================================
// LEAD CENTER
// ============================================================

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { useRequireSession } from '../lib/useSession'
import { supabase } from '../lib/supabaseClient'

const STATUSES = ['new', 'contacted', 'qualified', 'appointment', 'sold', 'lost']

export default function Leads() {
  const { client, loading, logout } = useRequireSession()
  const [leads, setLeads] = useState([])
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    if (!client) return
    supabase.from('leads').select('*').eq('client_id', client.id).order('captured_at', { ascending: false })
      .then(({ data }) => setLeads(data || []))
  }, [client])

  async function updateLead(id, patch) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    await supabase.from('leads').update(patch).eq('id', id)
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
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Name</th><th>Contact</th><th>Source</th><th>Value</th><th>Status</th><th>Notes</th></tr></thead>
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
                  <td>
                    <input
                      value={l.notes || ''}
                      onChange={(e) => updateLead(l.id, { notes: e.target.value })}
                      style={{ marginBottom: 0, fontSize: 13, padding: '6px 8px' }}
                    />
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
