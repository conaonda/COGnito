import { describe, it, expect, beforeEach, vi } from 'vitest'

// SW 로직을 직접 테스트하기 위해 SW 환경을 시뮬레이션
describe('sw.js 로직', () => {
  let listeners
  let cacheStore
  let cacheKeys

  function createRequest(url, range) {
    const headers = new Map()
    if (range) headers.set('range', range)
    return {
      url,
      headers: {
        has: (k) => headers.has(k),
        get: (k) => headers.get(k) || null,
      },
    }
  }

  function createResponse(body, status = 200) {
    const buf = new ArrayBuffer(body.length)
    const view = new Uint8Array(buf)
    for (let i = 0; i < body.length; i++) view[i] = body.charCodeAt(i)
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers({ 'content-type': 'application/octet-stream' }),
      clone() { return createResponse(body, status) },
      arrayBuffer() { return Promise.resolve(buf) },
    }
  }

  beforeEach(() => {
    listeners = {}
    cacheStore = new Map()
    cacheKeys = []

    const cacheApi = {
      match: vi.fn(async (key) => cacheStore.get(key) || undefined),
      put: vi.fn(async (key, resp) => {
        cacheStore.set(key, resp)
        cacheKeys.push(key)
      }),
      keys: vi.fn(async () => [...cacheKeys]),
      delete: vi.fn(async (key) => {
        cacheStore.delete(key)
        cacheKeys = cacheKeys.filter((k) => k !== key)
      }),
    }

    globalThis.self = {
      skipWaiting: vi.fn(),
      clients: { claim: vi.fn(() => Promise.resolve()) },
      location: { origin: 'https://example.com' },
      addEventListener: (name, fn) => { listeners[name] = fn },
    }

    globalThis.caches = {
      open: vi.fn(async () => cacheApi),
      keys: vi.fn(async () => []),
      delete: vi.fn(async () => true),
    }

    globalThis.fetch = vi.fn().mockResolvedValue(createResponse('default', 200))
  })

  async function loadSW() {
    vi.resetModules()
    await import('../../public/sw.js')
  }

  describe('isCOGRequest', () => {
    it('.tif + range 헤더 요청을 인터셉트함', async () => {
      await loadSW()
      const request = createRequest('https://example.com/data.tif', 'bytes=0-100')
      let responded = false
      const event = {
        request,
        respondWith: () => { responded = true },
      }
      listeners.fetch(event)
      expect(responded).toBe(true)
    })

    it('range 헤더 없으면 인터셉트하지 않음', async () => {
      await loadSW()
      const request = createRequest('https://example.com/data.tif')
      let responded = false
      const event = {
        request,
        respondWith: () => { responded = true },
      }
      listeners.fetch(event)
      expect(responded).toBe(false)
    })

    it('.tif/.tiff 아닌 요청은 인터셉트하지 않음', async () => {
      await loadSW()
      const request = createRequest('https://example.com/data.png', 'bytes=0-100')
      let responded = false
      const event = {
        request,
        respondWith: () => { responded = true },
      }
      listeners.fetch(event)
      expect(responded).toBe(false)
    })

    it('cross-origin COG 요청도 인터셉트함', async () => {
      await loadSW()
      const request = createRequest('https://s3.amazonaws.com/data.tif', 'bytes=0-100')
      let responded = false
      const event = {
        request,
        respondWith: () => { responded = true },
      }
      listeners.fetch(event)
      expect(responded).toBe(true)
    })
  })

  describe('cacheFirst', () => {
    it('206 응답도 캐시에 200으로 저장함', async () => {
      const resp206 = createResponse('data', 206)
      globalThis.fetch.mockResolvedValue(resp206)
      await loadSW()

      const request = createRequest('https://example.com/data.tif', 'bytes=0-100')
      let result
      const event = {
        request,
        respondWith: (p) => { result = p },
      }
      listeners.fetch(event)
      const response = await result
      expect(response.status).toBe(206)

      const cache = await caches.open('test')
      const stored = cache.put.mock.calls[0]?.[1]
      expect(stored?.status).toBe(200)
    })

    it('캐시 히트 시 네트워크 요청하지 않음', async () => {
      const cached = createResponse('cached-data', 200)
      await loadSW()

      const cache = await caches.open('test')
      const key = 'https://example.com/data.tif__bytes=0-100'
      cacheStore.set(key, cached)

      const request = createRequest('https://example.com/data.tif', 'bytes=0-100')
      let result
      const event = {
        request,
        respondWith: (p) => { result = p },
      }
      listeners.fetch(event)
      await result
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })
  })

  describe('eviction', () => {
    it('MAX_ENTRIES 초과 시 오래된 항목부터 삭제함', async () => {
      // MAX_ENTRIES=200이므로 201개 넣으면 1개 삭제
      for (let i = 0; i < 201; i++) {
        cacheKeys.push(`key-${i}`)
        cacheStore.set(`key-${i}`, createResponse('d', 200))
      }

      const resp = createResponse('new', 200)
      globalThis.fetch.mockResolvedValue(resp)
      await loadSW()

      const request = createRequest('https://example.com/tile.tif', 'bytes=0-10')
      let result
      const event = {
        request,
        respondWith: (p) => { result = p },
      }
      listeners.fetch(event)
      await result

      // wait for async eviction
      await new Promise((r) => setTimeout(r, 50))

      const cache = await caches.open('test')
      expect(cache.delete).toHaveBeenCalled()
    })
  })

  describe('activate', () => {
    it('이전 버전 캐시를 삭제함', async () => {
      globalThis.caches.keys.mockResolvedValue(['cog-tile-v0', 'cog-tile-v1', 'other-cache'])
      await loadSW()

      const event = {
        waitUntil: vi.fn((p) => p),
      }
      listeners.activate(event)
      await event.waitUntil.mock.calls[0][0]

      expect(globalThis.caches.delete).toHaveBeenCalledWith('cog-tile-v0')
      expect(globalThis.caches.delete).not.toHaveBeenCalledWith('cog-tile-v1')
      expect(globalThis.caches.delete).not.toHaveBeenCalledWith('other-cache')
    })

    it('이전 이름(cog-range-v*)의 캐시도 삭제함', async () => {
      globalThis.caches.keys.mockResolvedValue(['cog-range-v1', 'cog-tile-v0', 'cog-tile-v1', 'other-cache'])
      await loadSW()

      const event = {
        waitUntil: vi.fn((p) => p),
      }
      listeners.activate(event)
      await event.waitUntil.mock.calls[0][0]

      expect(globalThis.caches.delete).toHaveBeenCalledWith('cog-range-v1')
      expect(globalThis.caches.delete).toHaveBeenCalledWith('cog-tile-v0')
      expect(globalThis.caches.delete).not.toHaveBeenCalledWith('cog-tile-v1')
      expect(globalThis.caches.delete).not.toHaveBeenCalledWith('other-cache')
    })
  })
})
