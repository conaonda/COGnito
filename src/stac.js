/**
 * STAC 클라이언트 — 검색 및 메타데이터 변환
 */

export const STAC_PRESETS = [
  { name: 'Earth Search (AWS)', url: 'https://earth-search.aws.element84.com/v1' },
  { name: 'Planetary Computer', url: 'https://planetarycomputer.microsoft.com/api/stac/v1' }
]

/**
 * STAC API 검색
 */
export async function searchStac({ apiUrl, collections, bbox, datetime, limit = 10 }) {
  const body = { limit }
  if (collections && collections.length > 0) body.collections = collections
  if (bbox) body.bbox = bbox
  if (datetime) body.datetime = datetime

  const res = await fetch(`${apiUrl}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) throw new Error(`STAC 검색 실패: ${res.status}`)
  return res.json()
}

/**
 * STAC 컬렉션 목록 조회
 */
export async function getStacCollections(apiUrl) {
  const res = await fetch(`${apiUrl}/collections`)
  if (!res.ok) throw new Error(`컬렉션 조회 실패: ${res.status}`)
  const data = await res.json()
  return data.collections || []
}

/**
 * STAC item → COG 등록용 메타데이터 변환
 */
export function extractStacItemMeta(item) {
  const meta = {
    title: item.properties?.title || item.id,
    source_type: 'stac'
  }

  // 촬영일시
  if (item.properties?.datetime) {
    meta.captured_at = item.properties.datetime
  }

  // 센서
  const platform = item.properties?.platform
  const instrument = item.properties?.instruments?.[0]
  if (platform || instrument) {
    meta.sensor = [platform, instrument].filter(Boolean).join(' / ')
  }

  // bbox → region (간단 표기)
  if (item.bbox) {
    meta.bbox = item.bbox.slice(0, 4)
  }

  // COG URL 찾기 (visual > B04 > 첫 GeoTIFF)
  const assets = item.assets || {}
  let cogUrl = null
  let thumbnailUrl = null

  if (assets.visual?.href) {
    cogUrl = assets.visual.href
  } else if (assets.B04?.href) {
    cogUrl = assets.B04.href
  } else {
    for (const key of Object.keys(assets)) {
      const asset = assets[key]
      if (asset.type && asset.type.includes('geotiff')) {
        cogUrl = asset.href
        break
      }
    }
  }

  // 썸네일
  if (assets.thumbnail?.href) {
    thumbnailUrl = assets.thumbnail.href
  }

  meta.cogUrl = cogUrl
  meta.thumbnail_url = thumbnailUrl

  // 컬렉션 → 태그
  if (item.collection) {
    meta.tags = [item.collection]
  }

  return meta
}
