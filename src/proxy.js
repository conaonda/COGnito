const CORS_PROXY_URL = import.meta.env.VITE_CORS_PROXY_URL || ''

export const PROXY_HOSTS = [
  'sentinel-cogs.s3.us-west-2.amazonaws.com',
  'e84-earth-search-sentinel-data.s3.us-west-2.amazonaws.com',
  'sentinel-s2-l2a-cogs.s3.us-west-2.amazonaws.com',
]

export function proxyCogUrl(url) {
  if (!CORS_PROXY_URL) return url
  try {
    const { hostname } = new URL(url)
    if (!PROXY_HOSTS.some((h) => hostname === h)) return url
    return `${CORS_PROXY_URL}?url=${encodeURIComponent(url)}`
  } catch {
    return url
  }
}
