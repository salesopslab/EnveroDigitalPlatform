import Link from 'next/link'
import Footer from '../components/Footer'

// ============================================================
// Drafted as a reasonable starting-point terms of service covering
// what the platform actually does. Not legal advice — have this
// reviewed by an attorney before relying on it, especially the
// billing, liability, and governing-law sections, and fill in the
// bracketed placeholders (state, contact email, effective date).
// ============================================================

const S = { marginBottom: 28 }
const H = { fontSize: 19, fontWeight: 600, marginBottom: 10, marginTop: 0 }
const P = { color: '#374151', lineHeight: 1.7, marginBottom: 10 }

export default function Terms() {
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
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>Terms of Service</h1>
        <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 32 }}>Last updated: August 21, 2026</p>

        <section style={S}>
          <h2 style={H}>1. Acceptance of terms</h2>
          <p style={P}>By creating an account or using the EnveroDigital Platform ("Service"), you agree to these Terms of Service on behalf of yourself and the business you represent.</p>
        </section>

        <section style={S}>
          <h2 style={H}>2. Description of service</h2>
          <p style={P}>The Service is a software platform for AI-assisted SEO content generation, lead tracking, analytics, and customer communications (including Google review requests), offered on a subscription basis.</p>
        </section>

        <section style={S}>
          <h2 style={H}>3. Account registration</h2>
          <p style={P}>You must provide accurate information when creating an account and are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.</p>
        </section>

        <section style={S}>
          <h2 style={H}>4. Subscription and billing</h2>
          <p style={P}>Subscriptions are billed on a recurring monthly basis through Stripe. You may cancel or change your plan at any time through the Billing Portal accessible from your account settings; access continues through the end of the current billing period. Fees are non-refundable except where required by law.</p>
        </section>

        <section style={S}>
          <h2 style={H}>5. Your responsibilities</h2>
          <p style={P}>
            You are responsible for the accuracy of the business and customer information you enter
            into the Service, and for obtaining any consent required by law before we send emails or
            text messages to your customers on your behalf — including consent required under the
            Telephone Consumer Protection Act (TCPA) for SMS messages. You agree not to use the
            review-request feature to filter, incentivize, or otherwise manipulate which customers
            are asked for a review, consistent with Google's review policies.
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>6. AI-generated content</h2>
          <p style={P}>Content drafted by the Service's AI features is a starting point, not a finished product. You are responsible for reviewing and approving content before it is published, and we make no guarantee about search rankings, traffic, or other outcomes.</p>
        </section>

        <section style={S}>
          <h2 style={H}>7. Third-party services</h2>
          <p style={P}>The Service relies on third-party providers, including Google, Stripe, Resend, Twilio, Anthropic, and Supabase. We are not responsible for outages, errors, or changes in these providers' services.</p>
        </section>

        <section style={S}>
          <h2 style={H}>8. Intellectual property</h2>
          <p style={P}>You retain ownership of the business content and data you submit. We retain ownership of the Service itself, including its software and design.</p>
        </section>

        <section style={S}>
          <h2 style={H}>9. Limitation of liability</h2>
          <p style={P}>To the maximum extent permitted by law, Envero Digital is not liable for indirect, incidental, or consequential damages arising from your use of the Service.</p>
        </section>

        <section style={S}>
          <h2 style={H}>10. Termination</h2>
          <p style={P}>We may suspend or terminate accounts that violate these terms or misuse the Service, including sending review requests or messages that violate applicable law or third-party policies.</p>
        </section>

        <section style={S}>
          <h2 style={H}>11. Governing law</h2>
          <p style={P}>These terms are governed by the laws of the State of California, without regard to conflict-of-law principles.</p>
        </section>

        <section style={S}>
          <h2 style={H}>12. Changes to these terms</h2>
          <p style={P}>We may update these terms from time to time. Material changes will be reflected by updating the "Last updated" date above.</p>
        </section>

        <section style={S}>
          <h2 style={H}>13. Contact us</h2>
          <p style={P}>Questions about these terms can be directed to (888) 990-7550.</p>
        </section>
      </div>

      <Footer />
    </div>
  )
}
