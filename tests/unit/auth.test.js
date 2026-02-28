import { describe, it, expect, beforeEach, vi } from 'vitest'

// sessionStorage polyfill for Node.js
if (typeof globalThis.sessionStorage === 'undefined') {
  const store = new Map()
  globalThis.sessionStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  }
}

const { mockAuth } = vi.hoisted(() => {
  const mockAuth = {
    signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: { user: 'test' } } }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  }
  return { mockAuth }
})

vi.mock('../../src/supabase.js', () => ({ supabase: { auth: mockAuth } }))

import { consumePreLoginState, signIn, signOut, signInWithEmail, signUpWithEmail, getSession, onAuthStateChange } from '../../src/auth.js'

describe('consumePreLoginState', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('returns null when no saved state', () => {
    expect(consumePreLoginState()).toBeNull()
  })

  it('restores and returns saved JSON state', () => {
    const state = { cogUrl: 'https://example.com/test.tif', center: [100, 200], zoom: 5 }
    sessionStorage.setItem('cognito-pre-login-state', JSON.stringify(state))
    expect(consumePreLoginState()).toEqual(state)
  })

  it('removes state after consuming (one-time use)', () => {
    sessionStorage.setItem('cognito-pre-login-state', JSON.stringify({ cogUrl: 'x' }))
    consumePreLoginState()
    expect(sessionStorage.getItem('cognito-pre-login-state')).toBeNull()
  })

  it('returns null for invalid JSON', () => {
    sessionStorage.setItem('cognito-pre-login-state', '{broken')
    expect(consumePreLoginState()).toBeNull()
  })

  it('removes state even when JSON is invalid', () => {
    sessionStorage.setItem('cognito-pre-login-state', '{broken')
    consumePreLoginState()
    expect(sessionStorage.getItem('cognito-pre-login-state')).toBeNull()
  })
})

describe('auth functions with mocked supabase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    // Ensure window.location exists for Node.js
    if (!globalThis.window) globalThis.window = {}
    if (!globalThis.window.location) {
      globalThis.window.location = { origin: 'http://localhost:3000' }
    }
  })

  it('signIn calls signInWithOAuth and saves pre-login state', async () => {
    globalThis.window = globalThis.window || {}
    globalThis.window.currentCogMeta = { url: 'https://example.com/test.tif' }
    globalThis.window.olMap = { getView: () => ({ getCenter: () => [100, 200], getZoom: () => 5 }) }

    await signIn('google')
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: 'google' }))

    // Verify savePreLoginState was called (state saved to sessionStorage)
    const saved = JSON.parse(sessionStorage.getItem('cognito-pre-login-state'))
    expect(saved.cogUrl).toBe('https://example.com/test.tif')
    expect(saved.center).toEqual([100, 200])
    expect(saved.zoom).toBe(5)
  })

  it('signIn saves state without map when olMap is null', async () => {
    globalThis.window.currentCogMeta = null
    globalThis.window.olMap = null

    await signIn('google')
    const saved = JSON.parse(sessionStorage.getItem('cognito-pre-login-state'))
    expect(saved.cogUrl).toBeUndefined()
    expect(saved.center).toBeUndefined()
  })

  it('signOut calls supabase signOut', async () => {
    await signOut()
    expect(mockAuth.signOut).toHaveBeenCalled()
  })

  it('signInWithEmail calls signInWithPassword', async () => {
    await signInWithEmail('a@b.com', 'pass')
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass' })
  })

  it('signUpWithEmail calls signUp', async () => {
    await signUpWithEmail('a@b.com', 'pass')
    expect(mockAuth.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@b.com', password: 'pass' }))
  })

  it('getSession returns session', async () => {
    const session = await getSession()
    expect(session).toEqual({ user: 'test' })
  })

  it('onAuthStateChange returns subscription', () => {
    const cb = () => {}
    const result = onAuthStateChange(cb)
    expect(mockAuth.onAuthStateChange).toHaveBeenCalledWith(cb)
    expect(result.data.subscription.unsubscribe).toBeInstanceOf(Function)
  })
})
