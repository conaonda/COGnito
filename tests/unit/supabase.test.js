// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: {} })),
}))

describe('supabase preconnect 힌트', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    document.head.innerHTML = ''
  })

  it('VITE_SUPABASE_URL이 있으면 preconnect link를 추가한다', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key')
    await import('../../src/supabase.js')

    const links = document.head.querySelectorAll('link[rel="preconnect"]')
    expect(links).toHaveLength(1)
    expect(links[0].href).toBe('https://test.supabase.co/')
  })

  it('VITE_SUPABASE_URL이 없으면 preconnect link를 추가하지 않는다', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    await import('../../src/supabase.js')

    const links = document.head.querySelectorAll('link[rel="preconnect"]')
    expect(links).toHaveLength(0)
  })
})

describe('supabase 클라이언트', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    document.head.innerHTML = ''
  })

  it('URL과 키가 모두 있으면 supabase 클라이언트를 생성한다', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key')
    const { supabase } = await import('../../src/supabase.js')
    expect(supabase).not.toBeNull()
  })

  it('URL이 없으면 supabase는 null이다', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key')
    const { supabase } = await import('../../src/supabase.js')
    expect(supabase).toBeNull()
  })

  it('키가 없으면 supabase는 null이다', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    const { supabase } = await import('../../src/supabase.js')
    expect(supabase).toBeNull()
  })
})
