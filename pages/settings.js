// ============================================================
// SETTINGS — account + plan. No Stripe UI yet (Phase 2).
// ============================================================

import AppShell from '../components/AppShell'
import { useRequireSession } from '../lib/useSession'

export default function Settings() {
  const { client, session, loading, logout } = useRequireSession()
  if (loading || !client) return <div className="container" style={{ paddingTop: 80 }}>Loading...</div>

  return (
    <AppShell client={client} onLogout={logout}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Settings</h1>
      <div className="card" style={{ maxWidth: 480 }}>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 4 }}>Account email</p>
        <p style={{ marginBottom: 16 }}>{session?.user?.email}</p>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 4 }}>Plan</p>
        <p style={{ marginBottom: 16, textTransform: 'capitalize' }}>{client.tier} · {client.status}</p>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 4 }}>Billing</p>
        <p style={{ color: '#9ca3af' }}>Billing management is coming soon.</p>
      </div>
    </AppShell>
  )
}
