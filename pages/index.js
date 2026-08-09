import Link from 'next/link'

const TIERS = [
  {
    name: 'Tier 1',
    price: '$299',
    features: ['Subdomain on enverodigital.com', '500 SEO pages', 'AI content generation', 'Basic lead tracking'],
  },
  {
    name: 'Tier 2',
    price: '$599',
    features: ['Custom domain', '2,000 SEO pages', 'Social media content (7 platforms)', 'Advanced analytics'],
    highlighted: true,
  },
  {
    name: 'Tier 3',
    price: '$999',
    features: ['Full white-label', 'Unlimited pages', 'API access', 'Priority support'],
  },
]

export default function Home() {
  return (
    <div>
      <header style={{ padding: '20px 0', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 20 }}>EnveroDigital</strong>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/login" className="btn btn-secondary">Log in</Link>
            <Link href="/signup" className="btn btn-primary">Get started</Link>
          </div>
        </div>
      </header>

      <section style={{ padding: '80px 0', textAlign: 'center' }}>
        <div className="container">
          <h1 style={{ fontSize: 42, marginBottom: 16 }}>AI-powered SEO pages, built for lead gen</h1>
          <p style={{ fontSize: 18, color: '#6b7280', maxWidth: 600, margin: '0 auto 32px' }}>
            White-label content generation and programmatic SEO for agencies and lead gen companies. Launch hundreds of pages without a content team.
          </p>
          <Link href="/signup" className="btn btn-primary" style={{ fontSize: 16, padding: '14px 32px' }}>Start your trial</Link>
        </div>
      </section>

      <section style={{ padding: '40px 0 100px' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className="card"
              style={tier.highlighted ? { border: '2px solid #4f46e5' } : {}}
            >
              <h3 style={{ fontSize: 20, marginBottom: 8 }}>{tier.name}</h3>
              <p style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>
                {tier.price}<span style={{ fontSize: 15, fontWeight: 400, color: '#6b7280' }}>/month</span>
              </p>
              <ul style={{ listStyle: 'none', marginBottom: 24 }}>
                {tier.features.map((f) => (
                  <li key={f} style={{ padding: '6px 0', color: '#374151' }}>✓ {f}</li>
                ))}
              </ul>
              <Link href="/signup" className="btn btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                Choose {tier.name}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
