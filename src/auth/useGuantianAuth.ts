import { useEffect, useState } from 'react'
import {
  isSupabaseConfigured,
  signOut,
  supabase,
  type GuantianSession,
} from './supabaseClient'

export function useGuantianAuth() {
  const [session, setSession] = useState<GuantianSession | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) {
      return undefined
    }

    const client = supabase
    let isMounted = true

    const syncSession = () => {
      client.auth.getSession().then(({ data }) => {
        if (!isMounted) return
        setSession(data.session)
        setIsAuthLoading(false)
      })
    }

    syncSession()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncSession()
    }

    const handleFocus = () => syncSession()

    const handleStorage = (event: StorageEvent) => {
      if (event.key?.includes('auth-token')) syncSession()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('storage', handleStorage)

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsAuthLoading(false)
    })

    return () => {
      isMounted = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('storage', handleStorage)
      data.subscription.unsubscribe()
    }
  }, [])

  return {
    isAuthEnabled: isSupabaseConfigured,
    isAuthLoading,
    session,
    user: session?.user ?? null,
    signOut,
  }
}
