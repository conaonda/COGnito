import { supabase } from './supabase.js'
// detectBands: 동적 import로 초기 번들에서 제외
const _detectBands = async (tiff) => {
  const { detectBands } = await import('@conaonda/ol-cog-layers')
  return detectBands(tiff)
}

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
 * @param {object} [options]
 * @param {string} [options.search] - 제목/설명 키워드 검색
 * @param {string} [options.tag] - 태그 필터
 * @param {string} [options.sensor] - 센서 필터
 * @param {string} [options.region] - 지역 필터
 * @param {string} [options.sourceType] - 등록 출처 필터 ('stac' 또는 'manual', 빈 문자열이면 전체)
 * @param {string} [options.year] - 촬영 연도 필터 (captured_at 기반, 빈 문자열이면 전체)
 * @param {string} [options.sortBy] - 정렬 기준 ('created_at', 'like_count' 또는 'view_count')
 * @param {string} [options.userId] - 특정 사용자의 영상만 필터 (user_id 기준)
 * @param {number} [options.limit] - 페이지당 결과 수
 * @param {number} [options.offset] - 페이지네이션 오프셋
 */
export async function getCogImages({ search = '', tag = '', sensor = '', region = '', sourceType = '', year = '', sortBy = 'created_at', userId = '', limit = 20, offset = 0 } = {}) {
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
  if (sourceType) {
    query = query.eq('source_type', sourceType)
  }
  if (year) {
    query = query.gte('captured_at', `${year}-01-01T00:00:00Z`).lt('captured_at', `${Number(year) + 1}-01-01T00:00:00Z`)
  }
  if (userId) {
    query = query.eq('user_id', userId)
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

  // 조회수순 정렬: view_count 기준 내림차순 (클라이언트 사이드)
  if (sortBy === 'view_count' && result.data) {
    result.data.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
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
 * COG 영상 메타데이터 수정 (RLS가 소유자 체크)
 * @param {string} id - 영상 ID
 * @param {object} data - 수정할 필드 (title, description)
 */
export async function updateCogImage(id, data) {
  if (!supabase) return { error: { message: 'Supabase 미설정' } }

  return supabase
    .from('cog_images')
    .update(data)
    .eq('id', id)
}

/**
 * COG 영상 조회수 1 증가 (비로그인 사용자도 호출 가능)
 * @param {string} id - 영상 ID
 */
export async function incrementViewCount(id) {
  if (!supabase) return { error: { message: 'Supabase 미설정' } }

  const { error } = await supabase.rpc('increment_view_count', { image_id: id })
  return { error: error || null }
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

function parseTiffDate(str) {
  const m = str.match(/(\d{4})[:\-](\d{2})[:\-](\d{2})/)
  if (!m) return null
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}`)
  return isNaN(d) ? null : d.toISOString()
}

function extractDateFromUrl(url) {
  const path = url.split('?')[0]
  // YYYY-MM-DD or YYYY_MM_DD
  let m = path.match(/(\d{4})[-_](\d{2})[-_](\d{2})/)
  // YYYYMMDD (8자리, 단어 경계)
  if (!m) {
    const m8 = path.match(/(?:^|[^0-9])(\d{4})(\d{2})(\d{2})(?:$|[^0-9])/)
    if (m8) m = m8
  }
  if (!m) return null
  const y = parseInt(m[1]), mo = parseInt(m[2]), d = parseInt(m[3])
  if (y < 1970 || y > new Date().getFullYear() + 1 || mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const date = new Date(`${m[1]}-${m[2]}-${m[3]}`)
  /* v8 ignore next -- 방어 코드: 위 범위 검증으로 유효하지 않은 날짜 도달 불가 */
  return isNaN(date) ? null : date.toISOString()
}

/**
 * GeoTIFF 객체에서 CRS/bands/bbox 메타데이터 추출
 */
export async function extractCogMetadata(tiff, url) {
  const image = await tiff.getImage(0)

  // CRS
  const geoKeys = image.getGeoKeys()
  const epsgCode = geoKeys.ProjectedCSTypeGeoKey || geoKeys.GeographicTypeGeoKey || 4326
  const crs = `EPSG:${epsgCode}`

  // Bands
  const bandInfo = await _detectBands(tiff)

  // BBox
  const bbox = image.getBoundingBox()

  // Date extraction
  let captured_at = null

  // (a) TIFF tags
  const fd = image.getFileDirectory()
  if (fd.GDAL_METADATA) {
    const match = fd.GDAL_METADATA.match(/TIFFTAG_DATETIME[^>]*>([^<]+)</)
      || fd.GDAL_METADATA.match(/ACQUISITIONDATETIME[^>]*>([^<]+)</)
    if (match) {
      captured_at = parseTiffDate(match[1])
    }
  }
  if (!captured_at && fd.DateTime) {
    captured_at = parseTiffDate(fd.DateTime)
  }

  // (b) URL fallback
  if (!captured_at && url) {
    captured_at = extractDateFromUrl(url)
  }

  return {
    crs,
    bands: bandInfo.bands,
    bandType: bandInfo.type,
    bbox: [bbox[0], bbox[1], bbox[2], bbox[3]],
    width: image.getWidth(),
    height: image.getHeight(),
    captured_at
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
