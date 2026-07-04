import { useEffect, useRef, useState } from 'react'
import {
  isSupabaseConfigured,
  signInAnonymously,
  signOut,
  supabase,
  type GuantianSession,
} from './supabaseClient'

export function useGuantianAuth() {
  const [session, setSession] = useState<GuantianSession | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseConfigured)
  const [anonymousSignInError, setAnonymousSignInError] = useState<unknown>(null)
  const hasTriedAnonymousSignInRef = useRef(false)

  useEffect(() => {
    if (!supabase) {
      return undefined
    }

    const client = supabase
    let isMounted = true

    let isSigningInAnonymously = false

    const syncSession = () => {
      client.auth.getSession().then(async ({ data }) => {
        if (!isMounted) return

        if (data.session) {
          setSession(data.session)
          setAnonymousSignInError(null)
          setIsAuthLoading(false)
          return
        }

        if (!hasTriedAnonymousSignInRef.current && !isSigningInAnonymously) {
          hasTriedAnonymousSignInRef.current = true
          isSigningInAnonymously = true
          setIsAuthLoading(true)

          try {
            await signInAnonymously()
            const { data: refreshedData } = await client.auth.getSession()
            if (!isMounted) return
            setSession(refreshedData.session)
            setAnonymousSignInError(null)
          } catch (error) {
            if (!isMounted) return
            setSession(null)
            setAnonymousSignInError(error)
          } finally {
            isSigningInAnonymously = false
          }
        } else {
          setSession(null)
        }

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
      if (nextSession) setAnonymousSignInError(null)
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
    isAnonymous: Boolean((session?.user as { is_anonymous?: boolean } | undefined)?.is_anonymous),
    anonymousSignInError,
    session,
    user: session?.user ?? null,
    signOut,
  }
}
