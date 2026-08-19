// ============================================================
// INTEGRATIONS — Phase 2 placeholders
// ============================================================

import AppShell from '../components/AppShell'
import { useRequireSession } from '../lib/useSession'

const INTEGRATIONS = [
  { name: 'Google Search Console', desc: 'Import real ranking + impression data' },
  { name: 'Google Analytics', desc: 'Real organic visitor counts on the dashboard' },
  { name: 'Google Business Profile', desc: 'Publish posts directly' },
  { name: 'WordPress / CMS', desc: 'Publish generated pages to your own site' },
  { name: 'CRM', desc: 'Sync leads to your sales pipeline' },
  { name: 'Email / SMS', desc: 'Send generated email and SMS content' },
]

export default function Integrations() {
  const { client, loading, logout } = useRequireSession()
  if (loading || !client) return <div className="container" style={{ paddingTop: 80 }}>Loading...</div>

  return (
    <AppShell client={client} onLogout={logout}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Integrations</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {INTEGRATIONS.map((i) => (
          <div key={i.name} className="card">
            <p style={{ fontWeight: 600, marginBottom: 6 }}>{i.name}</p>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>{i.desc}</p>
            <button className="btn btn-secondary" disabled title="Coming soon">Coming soon</button>
          </div>
        ))}
      </div>
    </AppShell>
  )
}
