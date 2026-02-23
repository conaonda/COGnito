// Cloudflare Worker — COG CORS proxy
// Forwards .tif requests to whitelisted S3 origins, adding CORS headers.

const ALLOWED_HOSTS = [
  'sentinel-cogs.s3.us-west-2.amazonaws.com',
  'e84-earth-search-sentinel-data.s3.us-west-2.amazonaws.com',
  'sentinel-s2-l2a-cogs.s3.us-west-2.amazonaws.com',
]

function isAllowed(url) {
  try {
    const { hostname } = new URL(url)
    return ALLOWED_HOSTS.some((h) => hostname === h || hostname.endsWith('.' + h))
  } catch {
    return false
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
    }

    const url = new URL(request.url)
    const target = url.searchParams.get('url')

    if (!target) {
      return new Response('Missing ?url= parameter', { status: 400, headers: CORS_HEADERS })
    }

    if (!isAllowed(target)) {
      return new Response('Target host not in allowlist', { status: 403, headers: CORS_HEADERS })
    }

    // Forward the request, preserving Range header for COG partial fetches
    const headers = new Headers()
    if (request.headers.has('Range')) {
      headers.set('Range', request.headers.get('Range'))
    }

    const resp = await fetch(target, { method: request.method, headers })

    // Clone response and add CORS headers
    const responseHeaders = new Headers(resp.headers)
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      responseHeaders.set(k, v)
    }

    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: responseHeaders,
    })
  },
}
