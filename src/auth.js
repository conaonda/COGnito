import { supabase } from './supabase.js'

/**
 * OAuth 로그인
 * @param {'google'} provider
 */
export async function signIn(provider) {
  if (!supabase) return
  // OAuth 리다이렉트 전 앱 상태 저장
  savePreLoginState()
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

const STATE_KEY = 'cognito-pre-login-state'

function savePreLoginState() {
  const state = {}
  if (window.currentCogMeta?.url) state.cogUrl = window.currentCogMeta.url
  if (window.olMap) {
    const view = window.olMap.getView()
    state.center = view.getCenter()
    state.zoom = view.getZoom()
  }
  sessionStorage.setItem(STATE_KEY, JSON.stringify(state))
}

/**
 * 로그인 전 저장된 앱 상태 복원 (1회성)
 */
export function consumePreLoginState() {
  const raw = sessionStorage.getItem(STATE_KEY)
  if (!raw) return null
  sessionStorage.removeItem(STATE_KEY)
  try { return JSON.parse(raw) } catch { return null }
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
