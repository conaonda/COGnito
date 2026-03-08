import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSupabase, setMockQuery, createQueryMock, mockSession } = vi.hoisted(() => {
  let mockQuery
  let session = null
  function createQueryMock(resolveData = null, resolveError = null) {
    const result = { data: resolveData, error: resolveError, count: resolveData }
    const chain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: resolveData, error: resolveError }),
      then: (resolve) => resolve(result),
    }
    return chain
  }
  const mockSupabase = {
    from: vi.fn(() => mockQuery),
    auth: { getSession: vi.fn(() => Promise.resolve({ data: { session } })) },
  }
  return {
    mockSupabase,
    setMockQuery: (q) => { mockQuery = q; mockSupabase.from = vi.fn(() => q) },
    createQueryMock,
    mockSession: (s) => { session = s },
  }
})

vi.mock('../../src/supabase.js', () => ({ supabase: mockSupabase }))

import { toggleLike, getLikeCount, isLiked, getLikeStates } from '../../src/likes.js'

const testUser = { id: 'user-1' }
const testSession = { user: testUser }

beforeEach(() => {
  vi.clearAllMocks()
  mockSession(null)
})

describe('toggleLike', () => {
  it('returns error when not logged in', async () => {
    const result = await toggleLike('img-1')
    expect(result).toEqual({ liked: false, error: { message: '로그인 필요' } })
  })

  it('deletes existing like (unlike)', async () => {
    mockSession(testSession)
    // First query: check existing → found
    const checkQ = createQueryMock({ id: 'like-1' })
    setMockQuery(checkQ)

    // Override: after checking, delete
    const deleteResult = { error: null }
    const deleteQ = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(function () { return this }),
      then: (resolve) => resolve(deleteResult),
    }

    let callCount = 0
    mockSupabase.from = vi.fn(() => {
      callCount++
      return callCount === 1 ? checkQ : deleteQ
    })

    const result = await toggleLike('img-1')
    expect(result.liked).toBe(false)
    expect(result.error).toBeNull()
  })

  it('inserts new like', async () => {
    mockSession(testSession)
    const checkQ = createQueryMock(null) // no existing
    const insertResult = { error: null }
    const insertQ = {
      insert: vi.fn().mockReturnThis(),
      then: (resolve) => resolve(insertResult),
    }

    let callCount = 0
    mockSupabase.from = vi.fn(() => {
      callCount++
      return callCount === 1 ? checkQ : insertQ
    })

    const result = await toggleLike('img-1')
    expect(result.liked).toBe(true)
    expect(result.error).toBeNull()
  })
})

describe('getLikeCount', () => {
  it('returns count from supabase', async () => {
    const q = createQueryMock(null)
    // Override the chain to return count
    const result = { count: 5 }
    q.then = (resolve) => resolve(result)
    setMockQuery(q)

    const count = await getLikeCount('img-1')
    expect(count).toBe(5)
  })

  it('returns 0 when count is null', async () => {
    const q = createQueryMock(null)
    q.then = (resolve) => resolve({ count: null })
    setMockQuery(q)

    const count = await getLikeCount('img-1')
    expect(count).toBe(0)
  })
})

describe('isLiked', () => {
  it('returns false when not logged in', async () => {
    const result = await isLiked('img-1')
    expect(result).toBe(false)
  })

  it('returns true when like exists', async () => {
    mockSession(testSession)
    const q = createQueryMock({ id: 'like-1' })
    setMockQuery(q)

    const result = await isLiked('img-1')
    expect(result).toBe(true)
  })

  it('returns false when no like exists', async () => {
    mockSession(testSession)
    const q = createQueryMock(null)
    setMockQuery(q)

    const result = await isLiked('img-1')
    expect(result).toBe(false)
  })
})

describe('supabase null guard', () => {
  let nullMod
  beforeEach(async () => {
    vi.doMock('../../src/supabase.js', () => ({ supabase: null }))
    vi.resetModules()
    nullMod = await import('../../src/likes.js')
  })

  it('toggleLike returns error when supabase is null', async () => {
    const result = await nullMod.toggleLike('img-1')
    expect(result).toEqual({ liked: false, error: { message: 'Supabase 미설정' } })
  })

  it('getLikeCount returns 0 when supabase is null', async () => {
    expect(await nullMod.getLikeCount('img-1')).toBe(0)
  })

  it('isLiked returns false when supabase is null', async () => {
    expect(await nullMod.isLiked('img-1')).toBe(false)
  })
})

describe('getLikeStates — null data fallback', () => {
  it('handles null likes data gracefully', async () => {
    mockSession(testSession)

    const likesQ = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: (resolve) => resolve({ data: null }),
    }
    const userLikesQ = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: (resolve) => resolve({ data: null }),
    }

    let callCount = 0
    mockSupabase.from = vi.fn(() => {
      callCount++
      return callCount === 1 ? likesQ : userLikesQ
    })

    const result = await getLikeStates(['img-1'])
    expect(result.get('img-1')).toEqual({ count: 0, liked: false })
  })
})

describe('getLikeStates', () => {
  it('returns empty map for empty ids', async () => {
    const result = await getLikeStates([])
    expect(result.size).toBe(0)
  })

  it('returns counts and liked status for multiple images', async () => {
    mockSession(testSession)

    // likes query
    const likesData = [
      { cog_image_id: 'img-1' },
      { cog_image_id: 'img-1' },
      { cog_image_id: 'img-2' },
    ]
    const likesQ = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: (resolve) => resolve({ data: likesData }),
    }

    // user likes query
    const userLikesData = [{ cog_image_id: 'img-1' }]
    const userLikesQ = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: (resolve) => resolve({ data: userLikesData }),
    }

    let callCount = 0
    mockSupabase.from = vi.fn(() => {
      callCount++
      return callCount === 1 ? likesQ : userLikesQ
    })

    const result = await getLikeStates(['img-1', 'img-2', 'img-3'])
    expect(result.get('img-1')).toEqual({ count: 2, liked: true })
    expect(result.get('img-2')).toEqual({ count: 1, liked: false })
    expect(result.get('img-3')).toEqual({ count: 0, liked: false })
  })

  it('handles no session (counts only, no liked)', async () => {
    mockSession(null)

    const likesQ = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: (resolve) => resolve({ data: [{ cog_image_id: 'img-1' }] }),
    }
    setMockQuery(likesQ)

    const result = await getLikeStates(['img-1'])
    expect(result.get('img-1')).toEqual({ count: 1, liked: false })
  })
})
