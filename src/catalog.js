import { supabase } from './supabase.js'
import { detectBands } from './cogLayer.js'

/**
 * data URL 썸네일을 Supabase Storage에 업로드하고 public URL 반환
 * @param {string} dataUrl - base64 data URL
 * @returns {Promise<string|null>} public URL 또는 실패 시 null
 */
export async function uploadThumbnail(dataUrl) {
  if (!supabase) return null

  try {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const ext = blob.type === 'image/png' ? 'png' : 'jpg'
    const path = `${crypto.randomUUID()}.${ext}`

    const { error } = await supabase.storage
      .from('cog-thumbnails')
      .upload(path, blob, { contentType: blob.type })

    if (error) {
      console.warn('썸네일 업로드 실패:', error.message)
      return null
    }

    const { data } = supabase.storage
      .from('cog-thumbnails')
      .getPublicUrl(path)

    return data.publicUrl
  } catch (err) {
    console.warn('썸네일 업로드 실패:', err)
    return null
  }
}

/**
 * URL에서 자동 제목 생성
 * 확장자 제거, _/- → 공백 변환
 */
export function generateTitleFromUrl(url) {
  try {
    const filename = url.split('/').pop().split('?')[0]
    return filename
      .replace(/\.(tif|tiff|cog)$/i, '')
      .replace(/[_-]/g, ' ')
      .trim()
  } catch {
    return ''
  }
}

/**
 * 메타데이터에서 자동 설명 생성
 * "3-band RGB, EPSG:32615, 4096×4096" 형태
 */
export function generateDescriptionFromMeta(meta) {
  const parts = []
  if (meta.bands) {
    parts.push(`${meta.bands.length}-band ${meta.bandType || ''}`.trim())
  }
  if (meta.crs) parts.push(meta.crs)
  if (meta.width && meta.height) parts.push(`${meta.width}×${meta.height}`)
  return parts.join(', ')
}

/**
 * COG 영상을 cog_images 테이블에 등록
 */
export async function saveCogImage(data) {
  if (!supabase) return { error: { message: 'Supabase 미설정' } }

  const { data: result, error } = await supabase
    .from('cog_images')
    .insert({
      url: data.url,
      title: data.title || null,
      description: data.description || null,
      source_type: data.source_type || 'manual',
      crs: data.crs || null,
      bands: data.bands || null,
      bbox: data.bbox || null,
      thumbnail_url: data.thumbnail_url || null,
      metadata_json: data.metadata_json || null,
      captured_at: data.captured_at || null,
      region: data.region || null,
      sensor: data.sensor || null,
      resolution: data.resolution || null,
      tags: data.tags || []
    })
    .select()
    .single()

  return { data: result, error }
}

/**
 * COG 영상 목록 조회
 */
export async function getCogImages({ search = '', tag = '', sensor = '', region = '', sortBy = 'created_at', limit = 20, offset = 0 } = {}) {
  if (!supabase) return { data: [], error: null }

  let query = supabase
    .from('cog_images')
    .select('*, likes(count)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    // PostgREST 필터 연산자 주입 방지를 위해 특수문자 이스케이프
    const sanitized = search.replace(/[%_,().*]/g, '')
    if (sanitized) {
      query = query.or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`)
    }
  }
  if (tag) {
    query = query.contains('tags', [tag])
  }
  if (sensor) {
    query = query.ilike('sensor', `%${sensor}%`)
  }
  if (region) {
    query = query.ilike('region', `%${region}%`)
  }

  const result = await query

  // 인기순 정렬: likes count 기준 내림차순 (클라이언트 사이드)
  if (sortBy === 'like_count' && result.data) {
    result.data.sort((a, b) => {
      const countA = a.likes?.[0]?.count || 0
      const countB = b.likes?.[0]?.count || 0
      return countB - countA
    })
  }

  return result
}

/**
 * COG 영상 단건 조회
 */
export async function getCogImage(id) {
  if (!supabase) return { data: null, error: null }

  return supabase
    .from('cog_images')
    .select('*')
    .eq('id', id)
    .single()
}

/**
 * COG 영상 삭제 (RLS가 소유자 체크)
 */
export async function deleteCogImage(id) {
  if (!supabase) return { error: { message: 'Supabase 미설정' } }

  return supabase
    .from('cog_images')
    .delete()
    .eq('id', id)
}

/**
 * GeoTIFF 객체에서 CRS/bands/bbox 메타데이터 추출
 */
export async function extractCogMetadata(tiff) {
  const image = await tiff.getImage(0)

  // CRS
  const geoKeys = image.getGeoKeys()
  const epsgCode = geoKeys.ProjectedCSTypeGeoKey || geoKeys.GeographicTypeGeoKey || 4326
  const crs = `EPSG:${epsgCode}`

  // Bands
  const bandInfo = await detectBands(tiff)

  // BBox
  const bbox = image.getBoundingBox()

  return {
    crs,
    bands: bandInfo.bands,
    bandType: bandInfo.type,
    bbox: [bbox[0], bbox[1], bbox[2], bbox[3]],
    width: image.getWidth(),
    height: image.getHeight()
  }
}

/**
 * COG overview를 canvas에 렌더링하여 data URL 썸네일 생성
 */
export async function generateThumbnail(tiff) {
  try {
    // 가장 작은 overview 이미지 사용
    const imageCount = await tiff.getImageCount()
    let image = await tiff.getImage(0)

    // overview가 있으면 가장 작은 것 사용
    if (imageCount > 1) {
      image = await tiff.getImage(imageCount - 1)
    }

    const width = image.getWidth()
    const height = image.getHeight()
    const rasters = await image.readRasters()
    const samplesPerPixel = rasters.length

    // 썸네일 크기 (최대 128px)
    const maxSize = 128
    const scale = Math.min(maxSize / width, maxSize / height, 1)
    const tw = Math.round(width * scale)
    const th = Math.round(height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = tw
    canvas.height = th
    const ctx = canvas.getContext('2d')
    const imgData = ctx.createImageData(tw, th)

    // 밴드별 min/max 계산 (2%/98% percentile 근사)
    const bandStats = []
    for (let b = 0; b < Math.min(samplesPerPixel, 3); b++) {
      const band = rasters[b]
      let min = Infinity, max = -Infinity
      for (let i = 0; i < band.length; i++) {
        const v = band[i]
        if (v < min) min = v
        if (v > max) max = v
      }
      bandStats.push({ min, max })
    }

    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        const srcX = Math.floor(x / scale)
        const srcY = Math.floor(y / scale)
        const srcIdx = srcY * width + srcX
        const dstIdx = (y * tw + x) * 4

        if (samplesPerPixel >= 3) {
          // RGB
          for (let b = 0; b < 3; b++) {
            const v = rasters[b][srcIdx]
            const { min, max } = bandStats[b]
            imgData.data[dstIdx + b] = max > min ? Math.round(((v - min) / (max - min)) * 255) : 0
          }
        } else {
          // Grayscale
          const v = rasters[0][srcIdx]
          const { min, max } = bandStats[0]
          const normalized = max > min ? Math.round(((v - min) / (max - min)) * 255) : 0
          imgData.data[dstIdx] = normalized
          imgData.data[dstIdx + 1] = normalized
          imgData.data[dstIdx + 2] = normalized
        }
        imgData.data[dstIdx + 3] = 255
      }
    }

    ctx.putImageData(imgData, 0, 0)
    return canvas.toDataURL('image/png')
  } catch (err) {
    console.warn('썸네일 생성 실패:', err)
    return null
  }
}
