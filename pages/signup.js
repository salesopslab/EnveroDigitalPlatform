import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import Footer from '../components/Footer'

export default function Signup() {
  const router = useRouter()
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { company_name: companyName },
      },
    })

    setLoading(false)

    if (signupError) {
      setError(signupError.message)
      return
    }

    // New accounts land in the Business Brain onboarding wizard first,
    // not the dashboard directly — the dashboard needs a business
    // profile to be useful (opportunities/content generation reference it).
    router.push('/business-brain')
  }

  return (
    <div>
      <header className="site-header">
        <div className="container" style={{ justifyContent: 'center' }}>
          <Link href="/">
            <img src="/logo.png" alt="Envero Digital" style={{ height: 28, width: 'auto' }} />
          </Link>
        </div>
      </header>
      <p className="tagline">Build &bull; Automate &bull; Grow</p>
      <div className="container" style={{ maxWidth: 420, paddingTop: 56 }}>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Create your account</h1>
      <form onSubmit={handleSignup} className="card">
        <input
          type="text"
          placeholder="Company name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        {error && <p style={{ color: '#dc2626', marginBottom: 12, fontSize: 14 }}>{error}</p>}
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14, color: '#6b7280' }}>
        Already have an account? <Link href="/login" style={{ color: '#4f46e5' }}>Log in</Link>
      </p>
      <p style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
        By signing up, you agree to our <Link href="/terms" style={{ color: '#9ca3af' }}>Terms of Service</Link> and <Link href="/privacy" style={{ color: '#9ca3af' }}>Privacy Policy</Link>.
      </p>
      </div>
      <Footer />
    </div>
  )
}
