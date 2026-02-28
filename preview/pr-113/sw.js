const CACHE_NAME = 'cog-range-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (!isCOGRequest(request)) return
  event.respondWith(cacheFirst(request))
})

function isCOGRequest(request) {
  // cross-origin 요청은 인터셉트하지 않음 (CORS 모드가 깨질 수 있음)
  if (new URL(request.url).origin !== self.location.origin) return false
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
  // Cache API는 206 Partial Response를 지원하지 않으므로 200만 캐시
  if (response.ok && response.status === 200) {
    try {
      cache.put(key, response.clone())
    } catch (e) {
      // 캐시 실패는 무시 — 응답은 정상 반환
    }
  }
  return response
}
