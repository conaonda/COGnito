const CACHE_NAME = 'cog-range-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (!isCOGRequest(request)) return
  event.respondWith(cacheFirst(request))
})

function isCOGRequest(request) {
  return request.headers.has('range') &&
    (request.url.includes('.tif') || request.url.includes('.tiff'))
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
  if (response.status === 206 || response.ok) {
    cache.put(key, response.clone())
  }
  return response
}
