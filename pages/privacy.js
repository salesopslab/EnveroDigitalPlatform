import Link from 'next/link'
import Footer from '../components/Footer'

// ============================================================
// Drafted as a reasonable starting-point privacy policy covering
// what the platform actually does (Supabase, Anthropic, Google
// Analytics/Search Console/Places, Stripe, Resend, Twilio). Not
// legal advice — have this reviewed by an attorney before relying
// on it, especially the sections a compliance reviewer (e.g.
// Twilio toll-free verification) will actually check.
// ============================================================

const S = { marginBottom: 28 }
const H = { fontSize: 19, fontWeight: 600, marginBottom: 10, marginTop: 0 }
const P = { color: '#374151', lineHeight: 1.7, marginBottom: 10 }

export default function Privacy() {
  return (
    <div>
      <header className="site-header">
        <div className="container" style={{ justifyContent: 'center' }}>
          <Link href="/">
            <img src="/logo.png" alt="Envero Digital" style={{ height: 28, width: 'auto' }} />
          </Link>
        </div>
      </header>

      <div className="container" style={{ maxWidth: 720, paddingTop: 48, paddingBottom: 48 }}>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>Privacy Policy</h1>
        <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 32 }}>Last updated: August 21, 2026</p>

        <section style={S}>
          <p style={P}>
            Envero Digital ("Envero," "we," "us") operates the EnveroDigital Platform, a software
            tool that businesses ("Clients") use to manage SEO content, leads, and customer
            communications, including Google review requests. This policy explains what
            information we collect, how we use it, and the choices available to Clients and their
            customers.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>Information we collect</h2>
          <p style={P}><strong>Account information.</strong> When a business signs up, we collect the company name, email address, and business profile details entered during onboarding (industry, services, target markets, and similar).</p>
          <p style={P}><strong>Customer/lead information.</strong> Clients use the platform to store information about their own customers and leads — typically name, email, phone number, and details about the product or service of interest. This information is provided by our Clients or their customers, not collected by us directly from the public.</p>
          <p style={P}><strong>Website analytics.</strong> For Clients who connect Google Analytics and Google Search Console, we read (but do not modify) traffic and search performance data for that Client's own website.</p>
          <p style={P}><strong>Google Business/review data.</strong> For Clients who connect a Google Place ID, we read the business's public star rating and review count from Google's Places API.</p>
          <p style={P}><strong>Payment information.</strong> Subscription payments are processed by Stripe. We do not collect or store full card numbers — Stripe handles that directly.</p>
        </section>

        <section style={S}>
          <h2 style={H}>How we use information</h2>
          <p style={P}>We use the information above to operate the platform: generating SEO content, tracking leads, sending review requests on a Client's behalf, displaying analytics, and processing subscription billing.</p>
        </section>

        <section style={S}>
          <h2 style={H}>SMS and email communications</h2>
          <p style={P}>
            With a Client's use of the review-request feature, we send an email and/or SMS message
            to that Client's customer, inviting them to leave a Google review. Every message sent
            is the same neutral request — we do not filter who receives it based on how satisfied
            they appeared. SMS messages are only sent to a customer whose consent has been recorded
            by the Client beforehand. Every SMS includes an opt-out instruction ("Reply STOP to
            unsubscribe"), and every email includes a way to stop future messages. Message and data
            rates may apply.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>Third-party service providers</h2>
          <p style={P}>We rely on the following providers to operate the platform, each of which processes a limited slice of the data above on our behalf:</p>
          <p style={P}>Supabase (database and account authentication) · Anthropic (AI content generation) · Google (Analytics, Search Console, and Places APIs) · Stripe (subscription billing) · Resend (transactional email) · Twilio (SMS delivery) · Netlify (hosting).</p>
        </section>

        <section style={S}>
          <h2 style={H}>Data retention</h2>
          <p style={P}>We retain account and customer data for as long as a Client's account is active, plus a reasonable period afterward for legal and accounting purposes. A Client may request deletion of their account and associated data at any time by contacting us below.</p>
        </section>

        <section style={S}>
          <h2 style={H}>Your choices</h2>
          <p style={P}>Reply STOP to any SMS to stop receiving text messages. Use the unsubscribe link in any email to stop receiving emails. Contact us below to request access to, correction of, or deletion of your information.</p>
        </section>

        <section style={S}>
          <h2 style={H}>Children's privacy</h2>
          <p style={P}>This platform is intended for business use and is not directed at children under 13. We do not knowingly collect information from children.</p>
        </section>

        <section style={S}>
          <h2 style={H}>Changes to this policy</h2>
          <p style={P}>We may update this policy from time to time. Material changes will be reflected by updating the "Last updated" date above.</p>
        </section>

        <section style={S}>
          <h2 style={H}>Contact us</h2>
          <p style={P}>Questions about this policy or your data can be directed to (888) 990-7550.</p>
        </section>
      </div>

      <Footer />
    </div>
  )
}
