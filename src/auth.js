import { supabase } from './supabase.js'

/**
 * OAuth 로그인
 * @param {'github' | 'google'} provider
 */
export async function signIn(provider) {
  if (!supabase) return
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin + import.meta.env.BASE_URL
    }
  })
  if (error) console.error('Sign in error:', error.message)
}

/**
 * 로그아웃
 */
export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) console.error('Sign out error:', error.message)
}

/**
 * 현재 세션 조회
 */
export async function getSession() {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * 인증 상태 변경 구독
 * @param {(event: string, session: object|null) => void} callback
 * @returns {object} subscription
 */
export function onAuthStateChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } }
  return supabase.auth.onAuthStateChange(callback)
}
