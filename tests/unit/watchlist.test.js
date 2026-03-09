import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSupabase, setMockQuery, createQueryMock, mockSession } = vi.hoisted(() => {
  let mockQuery
  let session = null
  function createQueryMock(resolveData = null, resolveError = null) {
    const result = { data: resolveData, error: resolveError }
    const chain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(result),
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

import { getWatchlists, createWatchlist, deleteWatchlist, addItem, removeItem, getWatchlistItems, getWatchlistedImageIds } from '../../src/watchlist.js'

const testUser = { id: 'user-1' }
const testSession = { user: testUser }

beforeEach(() => {
  vi.clearAllMocks()
  mockSession(null)
})

describe('getWatchlists', () => {
  it('returns empty data when not logged in', async () => {
    const result = await getWatchlists()
    expect(result).toEqual({ data: [], error: { message: '로그인 필요' } })
  })

  it('queries watchlists for logged-in user', async () => {
    mockSession(testSession)
    const watchlists = [{ id: 'wl-1', name: 'My List' }]
    const q = createQueryMock(watchlists)
    setMockQuery(q)

    const result = await getWatchlists()
    expect(mockSupabase.from).toHaveBeenCalledWith('watchlists')
    expect(q.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(q.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(result.data).toEqual(watchlists)
  })
})

describe('createWatchlist', () => {
  it('returns error when not logged in', async () => {
    const result = await createWatchlist('Test')
    expect(result).toEqual({ data: null, error: { message: '로그인 필요' } })
  })

  it('inserts watchlist for logged-in user', async () => {
    mockSession(testSession)
    const created = { id: 'wl-1', name: 'Test' }
    const q = createQueryMock(created)
    setMockQuery(q)

    const result = await createWatchlist('Test')
    expect(mockSupabase.from).toHaveBeenCalledWith('watchlists')
    expect(q.insert).toHaveBeenCalledWith({ user_id: 'user-1', name: 'Test' })
  })
})

describe('deleteWatchlist', () => {
  it('deletes watchlist by id', async () => {
    const q = createQueryMock(null)
    setMockQuery(q)

    await deleteWatchlist('wl-1')
    expect(mockSupabase.from).toHaveBeenCalledWith('watchlists')
    expect(q.delete).toHaveBeenCalled()
    expect(q.eq).toHaveBeenCalledWith('id', 'wl-1')
  })
})

describe('addItem', () => {
  it('inserts item into watchlist_items', async () => {
    const q = createQueryMock(null)
    setMockQuery(q)

    await addItem('wl-1', 'img-1')
    expect(mockSupabase.from).toHaveBeenCalledWith('watchlist_items')
    expect(q.insert).toHaveBeenCalledWith({ watchlist_id: 'wl-1', cog_image_id: 'img-1' })
  })
})

describe('removeItem', () => {
  it('deletes item from watchlist_items', async () => {
    const q = createQueryMock(null)
    setMockQuery(q)

    await removeItem('wl-1', 'img-1')
    expect(mockSupabase.from).toHaveBeenCalledWith('watchlist_items')
    expect(q.delete).toHaveBeenCalled()
    expect(q.eq).toHaveBeenCalledWith('watchlist_id', 'wl-1')
    expect(q.eq).toHaveBeenCalledWith('cog_image_id', 'img-1')
  })
})

describe('getWatchlistItems', () => {
  it('queries watchlist_items with join', async () => {
    const items = [{ id: 'item-1', cog_images: { id: 'img-1' } }]
    const q = createQueryMock(items)
    setMockQuery(q)

    const result = await getWatchlistItems('wl-1')
    expect(mockSupabase.from).toHaveBeenCalledWith('watchlist_items')
    expect(q.select).toHaveBeenCalledWith('*, cog_images(*)')
    expect(q.eq).toHaveBeenCalledWith('watchlist_id', 'wl-1')
    expect(q.order).toHaveBeenCalledWith('added_at', { ascending: false })
    expect(result.data).toEqual(items)
  })
})

describe('getWatchlistedImageIds', () => {
  it('returns empty Set when not logged in', async () => {
    const result = await getWatchlistedImageIds(['img-1'])
    expect(result).toBeInstanceOf(Set)
    expect(result.size).toBe(0)
  })

  it('returns empty Set when cogImageIds is empty', async () => {
    mockSession(testSession)
    const result = await getWatchlistedImageIds([])
    expect(result).toBeInstanceOf(Set)
    expect(result.size).toBe(0)
  })

  it('returns empty Set when user has no watchlists', async () => {
    mockSession(testSession)
    const q = createQueryMock([])
    setMockQuery(q)

    const result = await getWatchlistedImageIds(['img-1'])
    expect(result).toBeInstanceOf(Set)
    expect(result.size).toBe(0)
  })

  it('returns Set of watchlisted image IDs', async () => {
    mockSession(testSession)
    const watchlistsQuery = createQueryMock([{ id: 'wl-1' }])
    const itemsQuery = createQueryMock([{ cog_image_id: 'img-1' }])
    let callCount = 0
    mockSupabase.from = vi.fn(() => {
      callCount++
      return callCount === 1 ? watchlistsQuery : itemsQuery
    })

    const result = await getWatchlistedImageIds(['img-1', 'img-2'])
    expect(result).toBeInstanceOf(Set)
    expect(result.has('img-1')).toBe(true)
    expect(result.has('img-2')).toBe(false)
  })
})
