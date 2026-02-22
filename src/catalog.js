import { supabase } from './supabase.js'
import { detectBands } from './cogLayer.js'

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
      source_type: 'manual',
      crs: data.crs || null,
      bands: data.bands || null,
      bbox: data.bbox || null,
      thumbnail_url: data.thumbnail_url || null,
      metadata_json: data.metadata_json || null
    })
    .select()
    .single()

  return { data: result, error }
}

/**
 * COG 영상 목록 조회
 */
export async function getCogImages({ search = '', limit = 20, offset = 0 } = {}) {
  if (!supabase) return { data: [], error: null }

  let query = supabase
    .from('cog_images')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  }

  return query
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
