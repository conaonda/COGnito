import { describe, it, expect, vi } from 'vitest'

vi.mock('../../src/supabase.js', () => ({ supabase: null }))

import { getWatchlists, createWatchlist, deleteWatchlist, addItem, removeItem, getWatchlistItems, getWatchlistedImageIds } from '../../src/watchlist.js'

describe('watchlist functions when supabase is null', () => {
  it('getWatchlists returns empty data', async () => {
    const result = await getWatchlists()
    expect(result).toEqual({ data: [], error: null })
  })

  it('createWatchlist returns error', async () => {
    const result = await createWatchlist('Test')
    expect(result).toEqual({ data: null, error: { message: 'Supabase 미설정' } })
  })

  it('deleteWatchlist returns error', async () => {
    const result = await deleteWatchlist('wl-1')
    expect(result).toEqual({ error: { message: 'Supabase 미설정' } })
  })

  it('addItem returns error', async () => {
    const result = await addItem('wl-1', 'img-1')
    expect(result).toEqual({ error: { message: 'Supabase 미설정' } })
  })

  it('removeItem returns error', async () => {
    const result = await removeItem('wl-1', 'img-1')
    expect(result).toEqual({ error: { message: 'Supabase 미설정' } })
  })

  it('getWatchlistItems returns empty data', async () => {
    const result = await getWatchlistItems('wl-1')
    expect(result).toEqual({ data: [], error: null })
  })

  it('getWatchlistedImageIds returns empty Set', async () => {
    const result = await getWatchlistedImageIds(['img-1', 'img-2'])
    expect(result).toBeInstanceOf(Set)
    expect(result.size).toBe(0)
  })
})
