import { supabase } from './supabase.js'

/**
 * OAuth 로그인
 * @param {'google'} provider
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
 * 이메일/비밀번호 로그인
 */
export async function signInWithEmail(email, password) {
  if (!supabase) return { error: { message: 'Supabase 미설정' } }
  return supabase.auth.signInWithPassword({ email, password })
}

/**
 * 이메일/비밀번호 회원가입
 */
export async function signUpWithEmail(email, password) {
  if (!supabase) return { error: { message: 'Supabase 미설정' } }
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin + import.meta.env.BASE_URL
    }
  })
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
