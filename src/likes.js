import { supabase } from './supabase.js'

/**
 * 좋아요 토글 (insert or delete)
 * @param {string} cogImageId
 * @returns {{ liked: boolean, error: object|null }}
 */
export async function toggleLike(cogImageId) {
  if (!supabase) return { liked: false, error: { message: 'Supabase 미설정' } }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return { liked: false, error: { message: '로그인 필요' } }

  const userId = session.user.id

  // 이미 좋아요 했는지 확인
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('cog_image_id', cogImageId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('id', existing.id)
    return { liked: false, error }
  } else {
    const { error } = await supabase
      .from('likes')
      .insert({ user_id: userId, cog_image_id: cogImageId })
    return { liked: true, error }
  }
}

/**
 * 특정 영상의 좋아요 수 조회
 * @param {string} cogImageId
 * @returns {number}
 */
export async function getLikeCount(cogImageId) {
  if (!supabase) return 0

  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('cog_image_id', cogImageId)

  return count || 0
}

/**
 * 현재 사용자가 좋아요 했는지 확인
 * @param {string} cogImageId
 * @returns {boolean}
 */
export async function isLiked(cogImageId) {
  if (!supabase) return false

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return false

  const { data } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('cog_image_id', cogImageId)
    .maybeSingle()

  return !!data
}

/**
 * 여러 영상의 좋아요 수 + 현재 사용자 좋아요 여부를 일괄 조회
 * @param {string[]} cogImageIds
 * @returns {Map<string, { count: number, liked: boolean }>}
 */
export async function getLikeStates(cogImageIds) {
  const result = new Map()
  if (!supabase || cogImageIds.length === 0) return result

  // 좋아요 수 조회
  const { data: likes } = await supabase
    .from('likes')
    .select('cog_image_id')
    .in('cog_image_id', cogImageIds)

  const countMap = {}
  for (const like of (likes || [])) {
    countMap[like.cog_image_id] = (countMap[like.cog_image_id] || 0) + 1
  }

  // 현재 사용자 좋아요 여부
  const { data: { session } } = await supabase.auth.getSession()
  const likedSet = new Set()

  if (session?.user) {
    const { data: userLikes } = await supabase
      .from('likes')
      .select('cog_image_id')
      .eq('user_id', session.user.id)
      .in('cog_image_id', cogImageIds)

    for (const like of (userLikes || [])) {
      likedSet.add(like.cog_image_id)
    }
  }

  for (const id of cogImageIds) {
    result.set(id, {
      count: countMap[id] || 0,
      liked: likedSet.has(id)
    })
  }

  return result
}
