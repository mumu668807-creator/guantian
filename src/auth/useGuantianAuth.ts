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

    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session)
      setIsAuthLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsAuthLoading(false)
    })

    return () => {
      isMounted = false
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
