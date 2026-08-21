// ============================================================
// Site footer for the public-facing pages (marketing, login,
// signup). Not used inside AppShell — the authenticated app has
// its own nav/footer area there.
// ============================================================

import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid #e5e7eb', marginTop: 40, padding: '24px 0' }}>
      <div
        className="container"
        style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 13, color: '#6b7280' }}
      >
        <span>&copy; {new Date().getFullYear()} Envero Digital</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/privacy" style={{ color: '#6b7280' }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: '#6b7280' }}>Terms of Service</Link>
        </div>
      </div>
    </footer>
  )
}
