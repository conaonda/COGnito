// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const {
  mockSupabase, mockGetSession, mockOnAuthStateChange,
  mockGetWatchlists, mockCreateWatchlist, mockDeleteWatchlist,
  mockAddItem, mockRemoveItem, mockGetWatchlistItems,
} = vi.hoisted(() => {
  const mockOnAuthStateChange = vi.fn()
  const mockSupabase = {
    auth: { onAuthStateChange: mockOnAuthStateChange },
  }
  return {
    mockSupabase,
    mockGetSession: vi.fn(),
    mockOnAuthStateChange,
    mockGetWatchlists: vi.fn(),
    mockCreateWatchlist: vi.fn(),
    mockDeleteWatchlist: vi.fn(),
    mockAddItem: vi.fn(),
    mockRemoveItem: vi.fn(),
    mockGetWatchlistItems: vi.fn(),
  }
})

vi.mock('../../src/supabase.js', () => ({ supabase: mockSupabase }))
vi.mock('../../src/auth.js', () => ({ getSession: mockGetSession }))
vi.mock('../../src/watchlist.js', () => ({
  getWatchlists: mockGetWatchlists,
  createWatchlist: mockCreateWatchlist,
  deleteWatchlist: mockDeleteWatchlist,
  addItem: mockAddItem,
  removeItem: mockRemoveItem,
  getWatchlistItems: mockGetWatchlistItems,
}))

import { initWatchlistUI } from '../../src/watchlistUI.js'

function setupDOM() {
  document.body.innerHTML = `
    <button id="watchlist-toggle-btn" aria-expanded="false" style="display:none"></button>
    <div id="watchlist-panel">
      <button id="watchlist-panel-close"></button>
      <div id="watchlist-list"></div>
      <button id="watchlist-create-btn"></button>
    </div>
  `
}

describe('watchlistUI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDOM()
    mockGetSession.mockResolvedValue({ user: { id: 'u1' } })
    mockOnAuthStateChange.mockImplementation(() => {})
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('watchlist-remove event opens remove modal with containing watchlists', async () => {
    initWatchlistUI(vi.fn())
    await new Promise(r => setTimeout(r, 10))

    mockGetWatchlists.mockResolvedValue({ data: [
      { id: 'wl1', name: 'My List' },
      { id: 'wl2', name: 'Other List' },
    ] })
    mockGetWatchlistItems
      .mockResolvedValueOnce({ data: [{ cog_image_id: 'img1' }] })
      .mockResolvedValueOnce({ data: [{ cog_image_id: 'img2' }] })

    document.dispatchEvent(new CustomEvent('watchlist-remove', { detail: { cogImageId: 'img1' } }))
    await new Promise(r => setTimeout(r, 50))

    const overlay = document.getElementById('watchlist-remove-overlay')
    expect(overlay).not.toBeNull()

    const buttons = overlay.querySelectorAll('button:not(.login-modal-close)')
    expect(buttons.length).toBe(1)
    expect(buttons[0].textContent).toBe('My List에서 제거')
  })

  it('remove modal dispatches watchlist-state-changed after removal', async () => {
    initWatchlistUI(vi.fn())
    await new Promise(r => setTimeout(r, 10))

    mockGetWatchlists.mockResolvedValue({ data: [{ id: 'wl1', name: 'List' }] })
    mockGetWatchlistItems.mockResolvedValue({ data: [{ cog_image_id: 'img1' }] })
    mockRemoveItem.mockResolvedValue({ error: null })

    const stateEvents = []
    document.addEventListener('watchlist-state-changed', (e) => stateEvents.push(e.detail))

    document.dispatchEvent(new CustomEvent('watchlist-remove', { detail: { cogImageId: 'img1' } }))
    await new Promise(r => setTimeout(r, 50))

    const overlay = document.getElementById('watchlist-remove-overlay')
    const removeBtn = overlay.querySelectorAll('button:not(.login-modal-close)')[0]
    removeBtn.click()
    await new Promise(r => setTimeout(r, 50))

    expect(stateEvents).toEqual([{ cogImageId: 'img1', watchlisted: false }])
    expect(document.getElementById('watchlist-remove-overlay')).toBeNull()
  })

  it('add modal dispatches watchlist-state-changed after adding', async () => {
    initWatchlistUI(vi.fn())
    await new Promise(r => setTimeout(r, 10))

    mockGetWatchlists.mockResolvedValue({ data: [{ id: 'wl1', name: 'List' }] })
    mockAddItem.mockResolvedValue({ error: null })

    const stateEvents = []
    document.addEventListener('watchlist-state-changed', (e) => stateEvents.push(e.detail))

    document.dispatchEvent(new CustomEvent('watchlist-add', { detail: { cogImageId: 'img1' } }))
    await new Promise(r => setTimeout(r, 50))

    const overlay = document.getElementById('watchlist-add-overlay')
    const addBtn = overlay.querySelectorAll('button:not(.login-modal-close)')[0]
    addBtn.click()
    await new Promise(r => setTimeout(r, 50))

    expect(stateEvents).toEqual([{ cogImageId: 'img1', watchlisted: true }])
  })
})
