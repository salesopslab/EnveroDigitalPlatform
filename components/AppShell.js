// ============================================================
// APP SHELL — left nav + top bar, wraps every authenticated page
// ============================================================

import Link from 'next/link'
import { useRouter } from 'next/router'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home' },
  { href: '/dashboard', label: 'Growth' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/content', label: 'Content' },
  { href: '/social', label: 'Social' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/leads', label: 'Leads' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/business-brain', label: 'Business Brain' },
  { href: '/integrations', label: 'Integrations' },
  { href: '/settings', label: 'Settings' },
]

// "Home" and "Growth" both point at /dashboard today (one Growth
// Dashboard page covers both per the Phase 1 scope) — dedupe so the
// nav doesn't show two active items on the same route.
const DEDUPED_NAV = NAV_ITEMS.filter((item, i) => NAV_ITEMS.findIndex((n) => n.href === item.href) === i)

export default function AppShell({ children, client, onLogout }) {
  const router = useRouter()

  return (
    <div className="app-shell">
      <aside className="app-nav">
        <div className="app-nav-logo">
          <img src="/logo.png" alt="Envero Digital" style={{ height: 24, width: 'auto' }} />
        </div>
        <nav>
          {DEDUPED_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`app-nav-link${router.pathname === item.href ? ' active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="app-nav-footer">
          <p className="app-nav-company">{client?.company_name || 'Your business'}</p>
          <button onClick={onLogout} className="btn btn-secondary" style={{ width: '100%' }}>
            Log out
          </button>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  )
}
