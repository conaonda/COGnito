import { describe, it, expect, vi } from 'vitest'

describe('proxyCogUrl', () => {
  it('returns url unchanged when CORS_PROXY_URL is empty', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_CORS_PROXY_URL', '')
    const { proxyCogUrl } = await import('../../src/proxy.js')
    expect(proxyCogUrl('https://example.com/test.tif')).toBe('https://example.com/test.tif')
    vi.unstubAllEnvs()
  })

  it('proxies matching host when CORS_PROXY_URL is set', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_CORS_PROXY_URL', 'https://proxy.example.com')
    const { proxyCogUrl } = await import('../../src/proxy.js')
    const url = 'https://sentinel-cogs.s3.us-west-2.amazonaws.com/data.tif'
    expect(proxyCogUrl(url)).toBe(`https://proxy.example.com?url=${encodeURIComponent(url)}`)
    vi.unstubAllEnvs()
  })

  it('does not proxy non-matching host', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_CORS_PROXY_URL', 'https://proxy.example.com')
    const { proxyCogUrl } = await import('../../src/proxy.js')
    const url = 'https://other-host.com/data.tif'
    expect(proxyCogUrl(url)).toBe(url)
    vi.unstubAllEnvs()
  })

  it('returns url unchanged for invalid URL', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_CORS_PROXY_URL', 'https://proxy.example.com')
    const { proxyCogUrl } = await import('../../src/proxy.js')
    expect(proxyCogUrl('not-a-url')).toBe('not-a-url')
    vi.unstubAllEnvs()
  })
})

describe('PROXY_HOSTS', () => {
  it('contains expected sentinel hosts', async () => {
    const { PROXY_HOSTS } = await import('../../src/proxy.js')
    expect(PROXY_HOSTS).toContain('sentinel-cogs.s3.us-west-2.amazonaws.com')
    expect(PROXY_HOSTS.length).toBe(3)
  })
})
