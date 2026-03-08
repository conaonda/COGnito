import { describe, it, expect, vi } from 'vitest'

vi.mock('../../src/supabase.js', () => ({ supabase: null }))
vi.mock('../../src/constants.js', () => ({ PRE_LOGIN_STATE_KEY: 'cognito-pre-login-state' }))

import { signIn, signOut, signInWithEmail, signUpWithEmail, getSession, onAuthStateChange } from '../../src/auth.js'

describe('auth functions when supabase is null', () => {
  it('signIn returns undefined', async () => {
    expect(await signIn('google')).toBeUndefined()
  })

  it('signOut returns undefined', async () => {
    expect(await signOut()).toBeUndefined()
  })

  it('signInWithEmail returns error', async () => {
    const result = await signInWithEmail('a@b.com', 'pass')
    expect(result.error.message).toBe('Supabase 미설정')
  })

  it('signUpWithEmail returns error', async () => {
    const result = await signUpWithEmail('a@b.com', 'pass')
    expect(result.error.message).toBe('Supabase 미설정')
  })

  it('getSession returns null', async () => {
    expect(await getSession()).toBeNull()
  })

  it('onAuthStateChange returns noop subscription', () => {
    const result = onAuthStateChange(() => {})
    expect(result.data.subscription.unsubscribe).toBeInstanceOf(Function)
    // noop unsubscribe 호출하여 함수 커버리지 확보
    result.data.subscription.unsubscribe()
  })
})
