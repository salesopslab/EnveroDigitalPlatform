// ============================================================
// SETTINGS — account + plan/billing (Phase 2 — Stripe).
// Checkout and plan management both use Stripe's own hosted pages
// (Checkout + Customer Portal) — see pages/api/create-checkout-session.js,
// pages/api/create-portal-session.js, and pages/api/stripe-webhook.js
// (the webhook is what actually activates a plan, not this page).
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/router'
import AppShell from '../components/AppShell'
import { useRequireSession } from '../lib/useSession'
import { supabase } from '../lib/supabaseClient'

const PLANS = [
  { tier: 'tier1', label: 'Tier 1', price: '$299/mo', features: ['500 pages', 'No social content', 'No white-label', 'No API access'] },
  { tier: 'tier2', label: 'Tier 2', price: '$599/mo', features: ['2,000 pages', 'Social content', 'No white-label', 'No API access'] },
  { tier: 'tier3', label: 'Tier 3', price: '$999/mo', features: ['Unlimited pages', 'Social content', 'White-label', 'API access'] },
]

const STATUS_COLOR = {
  trialing: '#6b7280',
  active: '#166534',
  past_due: '#dc2626',
  canceled: '#dc2626',
}

export default function Settings() {
  const router = useRouter()
  const { client, session, loading, logout } = useRequireSession()
  const [busyTier, setBusyTier] = useState(null)
  const [portalBusy, setPortalBusy] = useState(false)
  const [error, setError] = useState('')

  async function authedFetch(url, body) {
    const { data: { session: fresh } } = await supabase.auth.getSession()
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fresh?.access_token}`,
      },
      body: JSON.stringify(body || {}),
    })
  }

  async function subscribe(tier) {
    setError('')
    setBusyTier(tier)
    try {
      const res = await authedFetch('/api/create-checkout-session', { tier })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start checkout')
      window.location.href = data.url
    } catch (err) {
      setError(err.message)
      setBusyTier(null)
    }
  }

  async function openPortal() {
    setError('')
    setPortalBusy(true)
    try {
      const res = await authedFetch('/api/create-portal-session')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not open billing portal')
      window.location.href = data.url
    } catch (err) {
      setError(err.message)
      setPortalBusy(false)
    }
  }

  if (loading || !client) return <div className="container" style={{ paddingTop: 80 }}>Loading...</div>

  const hasSubscription = Boolean(client.stripe_subscription_id)
  const checkoutResult = router.query.checkout

  return (
    <AppShell client={client} onLogout={logout}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Settings</h1>

      {checkoutResult === 'success' && (
        <div className="card" style={{ marginBottom: 16, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <p style={{ color: '#166534', fontSize: 14 }}>
            Payment received — your plan will show as active here within a few seconds (Stripe confirms it via webhook).
          </p>
        </div>
      )}
      {checkoutResult === 'canceled' && (
        <div className="card" style={{ marginBottom: 16, background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p style={{ color: '#dc2626', fontSize: 14 }}>Checkout was canceled — no charge was made.</p>
        </div>
      )}

      <div className="card" style={{ maxWidth: 480, marginBottom: 20 }}>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 4 }}>Account email</p>
        <p style={{ marginBottom: 16 }}>{session?.user?.email}</p>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 4 }}>Plan</p>
        <p style={{ marginBottom: 16 }}>
          <span style={{ textTransform: 'capitalize' }}>{client.tier}</span>
          {' · '}
          <span style={{ textTransform: 'capitalize', color: STATUS_COLOR[client.status] || '#6b7280', fontWeight: 600 }}>
            {client.status?.replace('_', ' ')}
          </span>
        </p>
        {client.status === 'past_due' && (
          <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>
            Your last payment failed — update your payment method to avoid losing access.
          </p>
        )}
        {hasSubscription && (
          <button className="btn btn-primary" onClick={openPortal} disabled={portalBusy}>
            {portalBusy ? 'Opening…' : 'Manage Billing'}
          </button>
        )}
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: 14, marginBottom: 12 }}>{error}</p>}

      {!hasSubscription && (
        <>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Choose a plan</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, maxWidth: 760 }}>
            {PLANS.map((p) => (
              <div key={p.tier} className="card">
                <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{p.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>{p.price}</p>
                <ul style={{ color: '#6b7280', fontSize: 13, marginBottom: 16, paddingLeft: 18 }}>
                  {p.features.map((f) => <li key={f}>{f}</li>)}
                </ul>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => subscribe(p.tier)}
                  disabled={busyTier !== null}
                >
                  {busyTier === p.tier ? 'Redirecting…' : `Subscribe to ${p.label}`}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  )
}
