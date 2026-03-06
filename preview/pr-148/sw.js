const CACHE_VERSION = 1
const CACHE_NAME = `cog-tile-v${CACHE_VERSION}`
const MAX_ENTRIES = 200

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('cog-tile-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (!isCOGRequest(request)) return
  event.respondWith(cacheFirst(request))
})

function isCOGRequest(request) {
  const url = request.url
  if (!request.headers.has('range')) return false
  return url.includes('.tif') || url.includes('.tiff')
}

function getCacheKey(request) {
  const range = request.headers.get('range') || ''
  return `${request.url}__${range}`
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  const key = getCacheKey(request)

  const cached = await cache.match(key)
  if (cached) return cached

  const response = await fetch(request)

  if (response.ok) {
    try {
      const body = await response.clone().arrayBuffer()
      const headers = new Headers(response.headers)
      const cachedResponse = new Response(body, { status: 200, headers })
      await cache.put(key, cachedResponse)
      evictIfNeeded(cache)
    } catch {
      // cache failure is non-fatal
    }
  }

  return response
}

async function evictIfNeeded(cache) {
  try {
    const keys = await cache.keys()
    if (keys.length <= MAX_ENTRIES) return
    const toDelete = keys.slice(0, keys.length - MAX_ENTRIES)
    await Promise.all(toDelete.map((k) => cache.delete(k)))
  } catch {
    // eviction failure is non-fatal
  }
}
