// ============================================================
// SHARED SESSION HOOK
// Pulls the "redirect to /login if not signed in, load the
// clients row, watch for sign-out" logic that used to live only
// in pages/dashboard.js into one place every authenticated page
// can use.
// ============================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from './supabaseClient'

export function useRequireSession() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)

  async function reloadClient(userId) {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('*')
      .eq('id', userId)
      .single()
    setClient(clientRow)
    return clientRow
  }

  useEffect(() => {
    let active = true

    async function loadSession() {
      const { data: { session: currentSession } } = await supabase.auth.getSession()

      if (!currentSession) {
        router.replace('/login')
        return
      }

      if (!active) return
      setSession(currentSession)
      await reloadClient(currentSession.user.id)
      if (active) setLoading(false)
    }

    loadSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession) router.replace('/login')
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return { session, client, setClient, reloadClient, loading, logout }
}
