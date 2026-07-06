import { createClient, type Session } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export type GuantianSession = Session

export class SupabasePublicError extends Error {
  readonly status?: number
  readonly code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'SupabasePublicError'
    this.status = status
    this.code = code
  }
}

const throwPublicError = (error: { message?: string; status?: number; code?: string }) => {
  throw new SupabasePublicError(error.message || 'Unknown Supabase error', error.status, error.code)
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase is not configured')

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  })

  if (error) throwPublicError(error)
}

const getCurrentPageRedirectUrl = (language?: string) => {
  const url = new URL(window.location.href)
  url.hash = ''
  if (language) url.searchParams.set('lang', language)
  return url.toString()
}

export async function sendMagicLink(email: string, language?: string) {
  if (!supabase) throw new Error('Supabase is not configured')

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getCurrentPageRedirectUrl(language),
    },
  })

  if (error) throwPublicError(error)
}

export async function bindEmailToCurrentUser(email: string, language?: string) {
  if (!supabase) throw new Error('Supabase is not configured')

  const { error } = await supabase.auth.updateUser(
    { email },
    {
      emailRedirectTo: getCurrentPageRedirectUrl(language),
    },
  )

  if (error) throwPublicError(error)
}

export async function signInAnonymously() {
  if (!supabase) throw new Error('Supabase is not configured')

  const { error } = await supabase.auth.signInAnonymously()
  if (error) throwPublicError(error)
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function claimDailyCast(): Promise<boolean> {
  if (!supabase) return true

  const { data, error } = await supabase.rpc('claim_daily_cast')
  if (error) throwPublicError(error)

  return data === true
}
