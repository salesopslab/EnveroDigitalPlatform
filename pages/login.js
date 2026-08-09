import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (loginError) {
      setError(loginError.message)
      return
    }

    router.push('/dashboard')
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
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Log in</h1>
      <form onSubmit={handleLogin} className="card">
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
          required
        />
        {error && <p style={{ color: '#dc2626', marginBottom: 12, fontSize: 14 }}>{error}</p>}
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14, color: '#6b7280' }}>
        Don&apos;t have an account? <Link href="/signup" style={{ color: '#4f46e5' }}>Sign up</Link>
      </p>
      </div>
    </div>
  )
}
