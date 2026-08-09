import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSession() {
      const { data: { session: currentSession } } = await supabase.auth.getSession()

      if (!currentSession) {
        router.replace('/login')
        return
      }

      setSession(currentSession)

      const { data: clientRow } = await supabase
        .from('clients')
        .select('*')
        .eq('id', currentSession.user.id)
        .single()

      setClient(clientRow)
      setLoading(false)
    }

    loadSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession) router.replace('/login')
    })

    return () => authListener.subscription.unsubscribe()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return <div className="container" style={{ paddingTop: 80 }}>Loading...</div>
  }

  return (
    <div>
      <header className="site-header">
        <div className="container">
          <img src="/logo.png" alt="Envero Digital" style={{ height: 26, width: 'auto' }} />
          <button onClick={handleLogout} className="btn btn-secondary">Log out</button>
        </div>
      </header>

      <p className="tagline">Build &bull; Automate &bull; Grow</p>

      <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <h1 style={{ fontSize: 26, marginBottom: 4 }}>
          Welcome{client?.company_name ? `, ${client.company_name}` : ''}
        </h1>
        <p style={{ color: '#6b7280', marginBottom: 32 }}>{session?.user?.email}</p>

        <div className="stats-grid">
          <div className="card">
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>Plan</p>
            <p style={{ fontSize: 22, fontWeight: 600, textTransform: 'capitalize' }}>{client?.tier || 'tier1'}</p>
          </div>
          <div className="card">
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>Status</p>
            <p style={{ fontSize: 22, fontWeight: 600, textTransform: 'capitalize' }}>{client?.status || 'trialing'}</p>
          </div>
          <div className="card">
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>Pages generated</p>
            <p style={{ fontSize: 22, fontWeight: 600 }}>0</p>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Content generator</h2>
          <p style={{ color: '#6b7280' }}>Coming next — AI-generated SEO pages and social content will live here.</p>
        </div>
      </div>
    </div>
  )
}
