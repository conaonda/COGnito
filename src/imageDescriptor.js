const API_URL = import.meta.env.VITE_IMAGE_DESCRIPTOR_URL
const API_KEY = import.meta.env.VITE_IMAGE_DESCRIPTOR_API_KEY

/**
 * ImageDescriptor 서비스 사용 가능 여부
 */
export function isAvailable() {
  return !!(API_URL && API_KEY)
}

/**
 * ImageDescriptor API 호출
 * @param {{ thumbnail?: string, coordinates?: [number,number], captured_at?: string, bbox?: number[] }} params
 * @returns {Promise<{ description: string, location: { place_name: string }, land_cover: { classes: { label: string }[] }, context: object }>}
 */
export async function describeImage({ thumbnail, coordinates, captured_at, bbox }) {
  const res = await fetch(`${API_URL}/api/describe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({ thumbnail, coordinates, captured_at, bbox })
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ImageDescriptor 오류 (${res.status}): ${text || res.statusText}`)
  }

  return res.json()
}
