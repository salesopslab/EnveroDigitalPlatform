// ============================================================
// CONTENT CALENDAR
// Month grid + Backlog column for unscheduled items. True
// drag-and-drop is a fast-follow — reschedule via date picker
// for Phase 1.
// ============================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '../components/AppShell'
import { useRequireSession } from '../lib/useSession'
import { supabase } from '../lib/supabaseClient'

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function daysInMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() }

export default function Calendar() {
  const { client, loading, logout } = useRequireSession()
  const [items, setItems] = useState([])
  const [cursor, setCursor] = useState(() => new Date())
  const [autoPilot, setAutoPilot] = useState(false)
  const [autoPilotPublish, setAutoPilotPublish] = useState(false)

  useEffect(() => {
    if (!client) return
    setAutoPilot(client.auto_pilot_enabled || false)
    setAutoPilotPublish(client.auto_pilot_publish_enabled || false)
    supabase.from('content_items').select('*').eq('client_id', client.id).then(({ data }) => setItems(data || []))
  }, [client])

  async function toggleAutoPilot(field, value) {
    const patch = { [field]: value }
    await supabase.from('clients').update(patch).eq('id', client.id)
    if (field === 'auto_pilot_enabled') setAutoPilot(value)
    if (field === 'auto_pilot_publish_enabled') setAutoPilotPublish(value)
  }

  async function reschedule(id, dateStr) {
    await supabase.from('content_items').update({ scheduled_at: new Date(dateStr).toISOString(), status: 'scheduled' }).eq('id', id)
    const { data } = await supabase.from('content_items').select('*').eq('client_id', client.id)
    setItems(data || [])
  }

  if (loading || !client) return <div className="container" style={{ paddingTop: 80 }}>Loading...</div>

  const monthStart = startOfMonth(cursor)
  const numDays = daysInMonth(cursor)
  // A published item may never have gone through the scheduling step (the
  // editor's Publish button works straight from "approved"), so it only has
  // published_at set. Show it on the grid using whichever date it has —
  // only items with neither belong in the backlog.
  const displayDate = (i) => i.scheduled_at || i.published_at
  const backlog = items.filter((i) => !displayDate(i))
  const byDay = {}
  items.filter((i) => displayDate(i)).forEach((i) => {
    const d = new Date(displayDate(i))
    if (d.getMonth() === cursor.getMonth() && d.getFullYear() === cursor.getFullYear()) {
      const key = d.getDate()
      byDay[key] = byDay[key] || []
      byDay[key].push(i)
    }
  })

  return (
    <AppShell client={client} onLogout={logout}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>←</button>
          <h1 style={{ fontSize: 22 }}>{monthStart.toLocaleString('default', { month: 'long', year: 'numeric' })}</h1>
          <button className="btn btn-secondary" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>→</button>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 14 }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={autoPilot} onChange={(e) => toggleAutoPilot('auto_pilot_enabled', e.target.checked)} />
            Auto-Pilot suggestions
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={autoPilotPublish} disabled={!autoPilot} onChange={(e) => toggleAutoPilot('auto_pilot_publish_enabled', e.target.checked)} />
            Auto-publish
          </label>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
        <div className="card">
          <p style={{ fontWeight: 600, marginBottom: 10 }}>Backlog ({backlog.length})</p>
          {backlog.map((i) => (
            <div key={i.id} style={{ padding: '8px 0', borderTop: '1px solid #e5e7eb', fontSize: 13 }}>
              <Link href={`/content/${i.id}`} style={{ color: '#1a1a2e', fontWeight: 500 }}>{i.title || 'Untitled'}</Link>
              <input type="date" style={{ marginTop: 6, marginBottom: 0, fontSize: 12, padding: 6 }} onChange={(e) => e.target.value && reschedule(i.id, e.target.value)} />
            </div>
          ))}
          {backlog.length === 0 && <p style={{ color: '#9ca3af', fontSize: 13 }}>Nothing waiting.</p>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {Array.from({ length: numDays }, (_, i) => i + 1).map((day) => (
            <div key={day} className="card" style={{ minHeight: 90, padding: 8 }}>
              <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>{day}</p>
              {(byDay[day] || []).map((i) => (
                <Link key={i.id} href={`/content/${i.id}`} style={{ display: 'block', fontSize: 11, marginBottom: 4 }}>
                  <span className={`status-pill status-${i.status}`} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.title || 'Untitled'}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
