import { supabase } from './supabase.js'

/**
 * 현재 사용자의 관심목록 조회
 * @returns {{ data: Array, error: object|null }}
 */
export async function getWatchlists() {
  if (!supabase) return { data: [], error: null }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return { data: [], error: { message: '로그인 필요' } }

  return supabase
    .from('watchlists')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
}

/**
 * 관심목록 생성
 * @param {string} name
 * @returns {{ data: object, error: object|null }}
 */
export async function createWatchlist(name) {
  if (!supabase) return { data: null, error: { message: 'Supabase 미설정' } }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return { data: null, error: { message: '로그인 필요' } }

  return supabase
    .from('watchlists')
    .insert({ user_id: session.user.id, name })
    .select()
    .single()
}

/**
 * 관심목록 삭제
 * @param {string} watchlistId
 */
export async function deleteWatchlist(watchlistId) {
  if (!supabase) return { error: { message: 'Supabase 미설정' } }

  return supabase
    .from('watchlists')
    .delete()
    .eq('id', watchlistId)
}

/**
 * 관심목록에 영상 추가
 * @param {string} watchlistId
 * @param {string} cogImageId
 */
export async function addItem(watchlistId, cogImageId) {
  if (!supabase) return { error: { message: 'Supabase 미설정' } }

  return supabase
    .from('watchlist_items')
    .insert({ watchlist_id: watchlistId, cog_image_id: cogImageId })
}

/**
 * 관심목록에서 영상 제거
 * @param {string} watchlistId
 * @param {string} cogImageId
 */
export async function removeItem(watchlistId, cogImageId) {
  if (!supabase) return { error: { message: 'Supabase 미설정' } }

  return supabase
    .from('watchlist_items')
    .delete()
    .eq('watchlist_id', watchlistId)
    .eq('cog_image_id', cogImageId)
}

/**
 * 관심목록의 영상 목록 조회 (cog_images join)
 * @param {string} watchlistId
 * @returns {{ data: Array, error: object|null }}
 */
export async function getWatchlistItems(watchlistId) {
  if (!supabase) return { data: [], error: null }

  return supabase
    .from('watchlist_items')
    .select('*, cog_images(*)')
    .eq('watchlist_id', watchlistId)
    .order('added_at', { ascending: false })
}
