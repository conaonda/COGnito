// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const {
  mockGetCogImages, mockDeleteCogImage, mockUpdateCogImage, mockIncrementViewCount, mockToggleLike, mockGetLikeStates,
  mockGetWatchlistedImageIds, mockGetSession, mockOnAuthStateChange, mockSupabase,
} = vi.hoisted(() => {
  const mockOnAuthStateChange = vi.fn()
  return {
    mockGetCogImages: vi.fn(),
    mockDeleteCogImage: vi.fn(),
    mockUpdateCogImage: vi.fn(),
    mockIncrementViewCount: vi.fn().mockResolvedValue({ error: null }),
    mockToggleLike: vi.fn(),
    mockGetLikeStates: vi.fn(),
    mockGetWatchlistedImageIds: vi.fn(),
    mockGetSession: vi.fn(),
    mockOnAuthStateChange,
    mockSupabase: { auth: { onAuthStateChange: mockOnAuthStateChange } },
  }
})

vi.mock('../../src/supabase.js', () => ({ supabase: mockSupabase }))
vi.mock('../../src/catalog.js', () => ({
  getCogImages: mockGetCogImages,
  deleteCogImage: mockDeleteCogImage,
  updateCogImage: mockUpdateCogImage,
  incrementViewCount: mockIncrementViewCount,
  DEFAULT_SORT_ORDERS: { created_at: 'desc', like_count: 'desc', view_count: 'desc', captured_at: 'desc', title: 'asc' },
}))
vi.mock('../../src/likes.js', () => ({
  toggleLike: mockToggleLike,
  getLikeStates: mockGetLikeStates,
}))
vi.mock('../../src/watchlist.js', () => ({
  getWatchlistedImageIds: mockGetWatchlistedImageIds,
}))
vi.mock('../../src/auth.js', () => ({
  getSession: mockGetSession,
}))

import { initCatalogUI } from '../../src/catalogUI.js'

function setupDOM() {
  document.body.innerHTML = `
    <button id="catalog-toggle-btn" aria-expanded="false">카탈로그</button>
    <div id="catalog-panel">
      <button id="catalog-panel-close">닫기</button>
      <input id="catalog-search" type="text">
      <div id="catalog-list"></div>
      <button id="catalog-prev">이전</button>
      <button id="catalog-next">다음</button>
      <span id="catalog-page-info"></span>
    </div>
  `
}

describe('catalogUI delete button', () => {
  const TEST_USER_ID = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
    setupDOM()
    mockGetSession.mockResolvedValue({ user: { id: TEST_USER_ID } })
    mockOnAuthStateChange.mockImplementation(() => {})
    mockGetLikeStates.mockResolvedValue(new Map())
    mockGetWatchlistedImageIds.mockResolvedValue(new Set())
  })

  async function openPanelWithItems(items) {
    mockGetCogImages.mockResolvedValue({ data: items, totalCount: items.length, error: null })
    const onSelect = vi.fn()
    initCatalogUI(onSelect)
    // Wait for getSession to resolve
    await new Promise(r => setTimeout(r, 10))
    // Open panel
    document.getElementById('catalog-toggle-btn').click()
    // Wait for loadPage
    await new Promise(r => setTimeout(r, 10))
    return onSelect
  }

  it('shows delete button only for owner items', async () => {
    await openPanelWithItems([
      { id: '1', user_id: TEST_USER_ID, title: 'My Image', tags: [], created_at: '2026-01-01' },
      { id: '2', user_id: 'other-user', title: 'Other Image', tags: [], created_at: '2026-01-01' },
    ])

    const cards = document.querySelectorAll('.catalog-card')
    expect(cards).toHaveLength(2)

    expect(cards[0].querySelector('.catalog-delete-btn')).not.toBeNull()
    expect(cards[1].querySelector('.catalog-delete-btn')).toBeNull()
  })

  it('calls deleteCogImage after confirm and refreshes list', async () => {
    mockDeleteCogImage.mockResolvedValue({ error: null })
    window.confirm = vi.fn().mockReturnValue(true)

    await openPanelWithItems([
      { id: '1', user_id: TEST_USER_ID, title: 'My Image', tags: [], created_at: '2026-01-01' },
    ])

    document.querySelector('.catalog-delete-btn').click()
    await new Promise(r => setTimeout(r, 10))

    expect(mockDeleteCogImage).toHaveBeenCalledWith('1')
    expect(mockGetCogImages).toHaveBeenCalledTimes(2)
  })

  it('does not delete when confirm is cancelled', async () => {
    window.confirm = vi.fn().mockReturnValue(false)

    await openPanelWithItems([
      { id: '1', user_id: TEST_USER_ID, title: 'My Image', tags: [], created_at: '2026-01-01' },
    ])

    document.querySelector('.catalog-delete-btn').click()
    await new Promise(r => setTimeout(r, 10))

    expect(mockDeleteCogImage).not.toHaveBeenCalled()
  })

  it('shows alert on delete error', async () => {
    mockDeleteCogImage.mockResolvedValue({ error: { message: '권한 없음' } })
    window.confirm = vi.fn().mockReturnValue(true)
    window.alert = vi.fn()

    await openPanelWithItems([
      { id: '1', user_id: TEST_USER_ID, title: 'My Image', tags: [], created_at: '2026-01-01' },
    ])

    document.querySelector('.catalog-delete-btn').click()
    await new Promise(r => setTimeout(r, 10))

    expect(window.alert).toHaveBeenCalledWith('삭제 실패: 권한 없음')
  })

  it('shows edit button only for owner items', async () => {
    await openPanelWithItems([
      { id: '1', user_id: TEST_USER_ID, title: 'My Image', tags: [], created_at: '2026-01-01' },
      { id: '2', user_id: 'other-user', title: 'Other Image', tags: [], created_at: '2026-01-01' },
    ])

    const cards = document.querySelectorAll('.catalog-card')
    expect(cards[0].querySelector('.catalog-edit-btn')).not.toBeNull()
    expect(cards[1].querySelector('.catalog-edit-btn')).toBeNull()
  })

  it('opens edit modal and saves successfully', async () => {
    mockUpdateCogImage.mockResolvedValue({ error: null })

    await openPanelWithItems([
      { id: '1', user_id: TEST_USER_ID, title: 'Old Title', description: 'Old Desc', tags: [], created_at: '2026-01-01' },
    ])

    document.querySelector('.catalog-edit-btn').click()
    await new Promise(r => setTimeout(r, 10))

    const modal = document.getElementById('catalog-edit-modal')
    expect(modal).not.toBeNull()

    modal.querySelector('#edit-title').value = 'New Title'
    modal.querySelector('#edit-description').value = 'New Desc'
    modal.querySelector('#edit-save').click()
    await new Promise(r => setTimeout(r, 10))

    expect(mockUpdateCogImage).toHaveBeenCalledWith('1', { title: 'New Title', description: 'New Desc' })
    expect(document.getElementById('catalog-edit-modal')).toBeNull()
    expect(mockGetCogImages).toHaveBeenCalledTimes(2)
  })

  it('shows alert on edit save error', async () => {
    mockUpdateCogImage.mockResolvedValue({ error: { message: '수정 실패' } })
    window.alert = vi.fn()

    await openPanelWithItems([
      { id: '1', user_id: TEST_USER_ID, title: 'Title', tags: [], created_at: '2026-01-01' },
    ])

    document.querySelector('.catalog-edit-btn').click()
    await new Promise(r => setTimeout(r, 10))

    document.querySelector('#edit-save').click()
    await new Promise(r => setTimeout(r, 10))

    expect(window.alert).toHaveBeenCalledWith('수정 실패: 수정 실패')
    expect(document.getElementById('catalog-edit-modal')).not.toBeNull()
  })

  it('closes edit modal on cancel button', async () => {
    await openPanelWithItems([
      { id: '1', user_id: TEST_USER_ID, title: 'Title', tags: [], created_at: '2026-01-01' },
    ])

    document.querySelector('.catalog-edit-btn').click()
    await new Promise(r => setTimeout(r, 10))
    expect(document.getElementById('catalog-edit-modal')).not.toBeNull()

    document.querySelector('#edit-cancel').click()
    expect(document.getElementById('catalog-edit-modal')).toBeNull()
  })

  it('closes edit modal on overlay click', async () => {
    await openPanelWithItems([
      { id: '1', user_id: TEST_USER_ID, title: 'Title', tags: [], created_at: '2026-01-01' },
    ])

    document.querySelector('.catalog-edit-btn').click()
    await new Promise(r => setTimeout(r, 10))

    const overlay = document.getElementById('catalog-edit-modal')
    overlay.click()
    expect(document.getElementById('catalog-edit-modal')).toBeNull()
  })

  it('does not show delete button when not logged in', async () => {
    mockGetSession.mockResolvedValue(null)
    mockGetCogImages.mockResolvedValue({
      data: [{ id: '1', user_id: TEST_USER_ID, title: 'Image', tags: [], created_at: '2026-01-01' }],
      totalCount: 1,
      error: null,
    })

    initCatalogUI(vi.fn())
    await new Promise(r => setTimeout(r, 10))
    document.getElementById('catalog-toggle-btn').click()
    await new Promise(r => setTimeout(r, 10))

    expect(document.querySelector('.catalog-delete-btn')).toBeNull()
  })

  it('displays captured_at on card when present', async () => {
    await openPanelWithItems([
      { id: '1', user_id: TEST_USER_ID, title: 'With Date', tags: [], created_at: '2026-01-01', captured_at: '2025-06-15T00:00:00Z' },
    ])
    const captured = document.querySelector('.catalog-card-captured')
    expect(captured).not.toBeNull()
    expect(captured.textContent).toContain('2025-06-15')
  })

  it('does not display captured_at on card when absent', async () => {
    await openPanelWithItems([
      { id: '1', user_id: TEST_USER_ID, title: 'No Date', tags: [], created_at: '2026-01-01' },
    ])
    const captured = document.querySelector('.catalog-card-captured')
    expect(captured).toBeNull()
  })

  it('displays resolution on card when present', async () => {
    await openPanelWithItems([
      { id: '1', user_id: TEST_USER_ID, title: 'With Res', tags: [], created_at: '2026-01-01', resolution: 0.5 },
    ])
    const el = document.querySelector('.catalog-card-resolution')
    expect(el).not.toBeNull()
    expect(el.textContent).toContain('0.5m')
  })

  it('does not display resolution on card when absent', async () => {
    await openPanelWithItems([
      { id: '1', user_id: TEST_USER_ID, title: 'No Res', tags: [], created_at: '2026-01-01' },
    ])
    const el = document.querySelector('.catalog-card-resolution')
    expect(el).toBeNull()
  })
})

describe('catalogUI interactions', () => {
  const TEST_USER_ID = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    setupDOM()
    mockGetSession.mockResolvedValue({ user: { id: TEST_USER_ID } })
    mockOnAuthStateChange.mockImplementation(() => {})
    mockGetLikeStates.mockResolvedValue(new Map())
    mockGetWatchlistedImageIds.mockResolvedValue(new Set())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function initAndOpen(items, onSelect) {
    mockGetCogImages.mockResolvedValue({ data: items, totalCount: items.length, error: null })
    const cb = onSelect || vi.fn()
    initCatalogUI(cb)
    await vi.advanceTimersByTimeAsync(10)
    document.getElementById('catalog-toggle-btn').click()
    await vi.advanceTimersByTimeAsync(10)
    return cb
  }

  it('onAuthStateChange updates login state', async () => {
    mockGetCogImages.mockResolvedValue({ data: [{ id: '1', user_id: 'other', title: 'T', tags: [], created_at: '2026-01-01' }], totalCount: 1, error: null })
    initCatalogUI(vi.fn())
    await vi.advanceTimersByTimeAsync(10)

    // Get the callback registered with onAuthStateChange
    const authCallback = mockOnAuthStateChange.mock.calls[0][0]
    authCallback('SIGNED_IN', { user: { id: 'new-user' } })

    // Open panel - should now be logged in as new-user
    document.getElementById('catalog-toggle-btn').click()
    await vi.advanceTimersByTimeAsync(10)

    // Verify the user is logged in (actions row should appear)
    expect(document.querySelector('.catalog-card-actions')).not.toBeNull()
  })

  it('close button closes the panel', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])

    const panel = document.getElementById('catalog-panel')
    expect(panel.classList.contains('open')).toBe(true)

    document.getElementById('catalog-panel-close').click()
    expect(panel.classList.contains('open')).toBe(false)
    expect(document.getElementById('catalog-toggle-btn').getAttribute('aria-expanded')).toBe('false')
  })

  it('search input triggers debounced loadPage', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    mockGetCogImages.mockClear()
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })

    const searchInput = document.getElementById('catalog-search')
    searchInput.value = 'test'
    searchInput.dispatchEvent(new Event('input'))

    // Before debounce fires
    expect(mockGetCogImages).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(300)
    await vi.advanceTimersByTimeAsync(10)

    expect(mockGetCogImages).toHaveBeenCalledWith(expect.objectContaining({ search: 'test' }))
  })

  it('sort change triggers loadPage', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    mockGetCogImages.mockClear()
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })

    const sortSelect = document.getElementById('catalog-sort-select')
    sortSelect.value = 'like_count'
    sortSelect.dispatchEvent(new Event('change'))
    await vi.advanceTimersByTimeAsync(10)

    expect(mockGetCogImages).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'like_count' }))
  })

  it('sort select includes view_count option', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    const sortSelect = document.getElementById('catalog-sort-select')
    const options = Array.from(sortSelect.options).map(o => o.value)
    expect(options).toContain('view_count')
  })

  it('sort by view_count triggers loadPage with sortBy view_count', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    mockGetCogImages.mockClear()
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })

    const sortSelect = document.getElementById('catalog-sort-select')
    sortSelect.value = 'view_count'
    sortSelect.dispatchEvent(new Event('change'))
    await vi.advanceTimersByTimeAsync(10)

    expect(mockGetCogImages).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'view_count' }))
  })

  it('sort select includes title option', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    const sortSelect = document.getElementById('catalog-sort-select')
    const options = Array.from(sortSelect.options).map(o => o.value)
    expect(options).toContain('title')
  })

  it('sort by title triggers loadPage with sortBy title', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    mockGetCogImages.mockClear()
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })

    const sortSelect = document.getElementById('catalog-sort-select')
    sortSelect.value = 'title'
    sortSelect.dispatchEvent(new Event('change'))
    await vi.advanceTimersByTimeAsync(10)

    expect(mockGetCogImages).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'title' }))
  })

  it('sort order toggle button exists and defaults to ↓', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    const btn = document.getElementById('catalog-sort-order-btn')
    expect(btn).toBeTruthy()
    expect(btn.textContent).toBe('↓')
  })

  it('sort order toggle switches direction and reloads', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    mockGetCogImages.mockClear()
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })

    const btn = document.getElementById('catalog-sort-order-btn')
    btn.click()
    await vi.advanceTimersByTimeAsync(10)

    expect(btn.textContent).toBe('↑')
    expect(mockGetCogImages).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 'asc' }))
  })

  it('sort criterion change resets sort order to default', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])

    // Toggle to asc first
    const btn = document.getElementById('catalog-sort-order-btn')
    btn.click()
    await vi.advanceTimersByTimeAsync(10)

    mockGetCogImages.mockClear()
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })

    // Change to title (default: asc)
    const sortSelect = document.getElementById('catalog-sort-select')
    sortSelect.value = 'title'
    sortSelect.dispatchEvent(new Event('change'))
    await vi.advanceTimersByTimeAsync(10)

    expect(btn.textContent).toBe('↑')
    expect(mockGetCogImages).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 'asc' }))
  })

  it('prev button navigates back', async () => {
    // First load returns full page to enable next
    const items = Array.from({ length: 20 }, (_, i) => ({ id: String(i), title: `T${i}`, tags: [], created_at: '2026-01-01' }))
    await initAndOpen(items)

    // Go to page 2
    mockGetCogImages.mockResolvedValue({ data: [{ id: '20', title: 'T20', tags: [], created_at: '2026-01-01' }], totalCount: 1, error: null })
    document.getElementById('catalog-next').click()
    await vi.advanceTimersByTimeAsync(10)

    // Go back
    mockGetCogImages.mockClear()
    mockGetCogImages.mockResolvedValue({ data: items, totalCount: items.length, error: null })
    document.getElementById('catalog-prev').click()
    await vi.advanceTimersByTimeAsync(10)

    expect(mockGetCogImages).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }))
  })

  it('next button navigates forward', async () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: String(i), title: `T${i}`, tags: [], created_at: '2026-01-01' }))
    await initAndOpen(items)

    mockGetCogImages.mockClear()
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })
    document.getElementById('catalog-next').click()
    await vi.advanceTimersByTimeAsync(10)

    expect(mockGetCogImages).toHaveBeenCalledWith(expect.objectContaining({ offset: 20 }))
  })

  it('cog-registered event refreshes list when panel is open', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    mockGetCogImages.mockClear()
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })

    document.dispatchEvent(new Event('cog-registered'))
    await vi.advanceTimersByTimeAsync(10)

    expect(mockGetCogImages).toHaveBeenCalled()
  })

  it('shows error message on loadPage error', async () => {
    mockGetCogImages.mockResolvedValue({ data: null, error: { message: '서버 오류' } })
    initCatalogUI(vi.fn())
    await vi.advanceTimersByTimeAsync(10)

    document.getElementById('catalog-toggle-btn').click()
    await vi.advanceTimersByTimeAsync(10)

    expect(document.getElementById('catalog-list').textContent).toContain('서버 오류')
  })

  it('shows empty message when no data', async () => {
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })
    initCatalogUI(vi.fn())
    await vi.advanceTimersByTimeAsync(10)

    document.getElementById('catalog-toggle-btn').click()
    await vi.advanceTimersByTimeAsync(10)

    expect(document.getElementById('catalog-list').textContent).toContain('등록된 영상이 없습니다')
    expect(document.getElementById('catalog-prev').disabled).toBe(true)
    expect(document.getElementById('catalog-next').disabled).toBe(true)
  })

  it('shows total count text when data loads', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    expect(document.getElementById('catalog-total-count').textContent).toBe('총 1개 영상')
  })

  it('shows 총 0개 영상 when data is empty', async () => {
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })
    initCatalogUI(vi.fn())
    await vi.advanceTimersByTimeAsync(10)

    document.getElementById('catalog-toggle-btn').click()
    await vi.advanceTimersByTimeAsync(10)

    expect(document.getElementById('catalog-total-count').textContent).toBe('총 0개 영상')
  })

  it('clears total count text on error', async () => {
    mockGetCogImages.mockResolvedValue({ data: null, totalCount: 0, error: { message: 'DB error' } })
    initCatalogUI(vi.fn())
    await vi.advanceTimersByTimeAsync(10)

    document.getElementById('catalog-toggle-btn').click()
    await vi.advanceTimersByTimeAsync(10)

    expect(document.getElementById('catalog-total-count').textContent).toBe('')
  })

  it('like button toggles like state', async () => {
    mockToggleLike.mockResolvedValue({ liked: true, error: null })
    mockGetLikeStates.mockResolvedValue(new Map([['1', { count: 5, liked: false }]]))

    await initAndOpen([{ id: '1', user_id: 'other', title: 'T', tags: [], created_at: '2026-01-01' }])

    const likeBtn = document.querySelector('.catalog-like-btn')
    expect(likeBtn).not.toBeNull()

    likeBtn.click()
    await vi.advanceTimersByTimeAsync(10)

    expect(mockToggleLike).toHaveBeenCalledWith('1')
    expect(likeBtn.querySelector('.like-count').textContent).toBe('6')
    expect(likeBtn.classList.contains('liked')).toBe(true)
  })

  it('like button handles unlike', async () => {
    mockToggleLike.mockResolvedValue({ liked: false, error: null })
    mockGetLikeStates.mockResolvedValue(new Map([['1', { count: 3, liked: true }]]))

    await initAndOpen([{ id: '1', user_id: 'other', title: 'T', tags: [], created_at: '2026-01-01' }])

    const likeBtn = document.querySelector('.catalog-like-btn')
    likeBtn.click()
    await vi.advanceTimersByTimeAsync(10)

    expect(likeBtn.querySelector('.like-count').textContent).toBe('2')
    expect(likeBtn.classList.contains('liked')).toBe(false)
  })

  it('watchlist button dispatches watchlist-add event when not watchlisted', async () => {
    await initAndOpen([{ id: '1', user_id: 'other', title: 'T', tags: [], created_at: '2026-01-01' }])

    const handler = vi.fn()
    document.addEventListener('watchlist-add', handler)

    document.querySelector('.catalog-watchlist-btn').click()

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      detail: { cogImageId: '1' }
    }))
    document.removeEventListener('watchlist-add', handler)
  })

  it('watchlist button shows watchlisted state when item is in watchlist', async () => {
    mockGetWatchlistedImageIds.mockResolvedValue(new Set(['1']))
    await initAndOpen([{ id: '1', user_id: 'other', title: 'T', tags: [], created_at: '2026-01-01' }])

    const btn = document.querySelector('.catalog-watchlist-btn')
    expect(btn.classList.contains('watchlisted')).toBe(true)
    expect(btn.textContent).toBe('✓ 관심목록')
  })

  it('watchlist button shows default state when item is not watchlisted', async () => {
    await initAndOpen([{ id: '1', user_id: 'other', title: 'T', tags: [], created_at: '2026-01-01' }])

    const btn = document.querySelector('.catalog-watchlist-btn')
    expect(btn.classList.contains('watchlisted')).toBe(false)
    expect(btn.textContent).toBe('+ 관심목록')
  })

  it('watchlist button dispatches watchlist-remove event when already watchlisted', async () => {
    mockGetWatchlistedImageIds.mockResolvedValue(new Set(['1']))
    await initAndOpen([{ id: '1', user_id: 'other', title: 'T', tags: [], created_at: '2026-01-01' }])

    const removeHandler = vi.fn()
    const addHandler = vi.fn()
    document.addEventListener('watchlist-remove', removeHandler)
    document.addEventListener('watchlist-add', addHandler)

    document.querySelector('.catalog-watchlist-btn').click()

    expect(removeHandler).toHaveBeenCalledWith(expect.objectContaining({ detail: { cogImageId: '1' } }))
    expect(addHandler).not.toHaveBeenCalled()
    document.removeEventListener('watchlist-remove', removeHandler)
    document.removeEventListener('watchlist-add', addHandler)
  })

  it('watchlist-state-changed event updates button to watchlisted state', async () => {
    await initAndOpen([{ id: '1', user_id: 'other', title: 'T', tags: [], created_at: '2026-01-01' }])

    const btn = document.querySelector('.catalog-watchlist-btn')
    expect(btn.classList.contains('watchlisted')).toBe(false)

    document.dispatchEvent(new CustomEvent('watchlist-state-changed', { detail: { cogImageId: '1', watchlisted: true } }))

    expect(btn.classList.contains('watchlisted')).toBe(true)
    expect(btn.textContent).toBe('✓ 관심목록')
  })

  it('watchlist-state-changed event updates button to unwatchlisted state', async () => {
    mockGetWatchlistedImageIds.mockResolvedValue(new Set(['1']))
    await initAndOpen([{ id: '1', user_id: 'other', title: 'T', tags: [], created_at: '2026-01-01' }])

    const btn = document.querySelector('.catalog-watchlist-btn')
    expect(btn.classList.contains('watchlisted')).toBe(true)

    document.dispatchEvent(new CustomEvent('watchlist-state-changed', { detail: { cogImageId: '1', watchlisted: false } }))

    expect(btn.classList.contains('watchlisted')).toBe(false)
    expect(btn.textContent).toBe('+ 관심목록')
  })

  it('watchlist-state-changed event ignores different cogImageId', async () => {
    mockGetWatchlistedImageIds.mockResolvedValue(new Set(['1']))
    await initAndOpen([{ id: '1', user_id: 'other', title: 'T', tags: [], created_at: '2026-01-01' }])

    const btn = document.querySelector('.catalog-watchlist-btn')

    document.dispatchEvent(new CustomEvent('watchlist-state-changed', { detail: { cogImageId: '999', watchlisted: false } }))

    expect(btn.classList.contains('watchlisted')).toBe(true)
    expect(btn.textContent).toBe('✓ 관심목록')
  })

  it('shows like count for non-logged-in users', async () => {
    mockGetSession.mockResolvedValue(null)
    mockGetCogImages.mockResolvedValue({
      data: [{ id: '1', title: 'T', tags: [], created_at: '2026-01-01', likes: [{ count: 10 }] }],
      totalCount: 1,
      error: null,
    })
    mockGetLikeStates.mockResolvedValue(new Map())

    initCatalogUI(vi.fn())
    await vi.advanceTimersByTimeAsync(10)

    document.getElementById('catalog-toggle-btn').click()
    await vi.advanceTimersByTimeAsync(10)

    const cards = document.querySelectorAll('.catalog-card')
    expect(cards[0].textContent).toContain('♥ 10')
  })

  it('card click closes panel, calls onSelectCog and incrementViewCount', async () => {
    const onSelect = vi.fn()
    const item = { id: '1', url: 'http://example.com/cog.tif', title: 'T', tags: [], created_at: '2026-01-01' }
    await initAndOpen([item], onSelect)

    document.querySelector('.catalog-card').click()

    expect(document.getElementById('catalog-panel').classList.contains('open')).toBe(false)
    expect(onSelect).toHaveBeenCalledWith('http://example.com/cog.tif', expect.objectContaining({ id: '1' }))
    expect(mockIncrementViewCount).toHaveBeenCalledWith('1')
  })

  it('renders view count on card', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01', view_count: 42 }])

    const viewCount = document.querySelector('.catalog-view-count')
    expect(viewCount).not.toBeNull()
    expect(viewCount.textContent).toBe('👁 42')
  })

  it('renders view count as 0 when missing', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])

    const viewCount = document.querySelector('.catalog-view-count')
    expect(viewCount.textContent).toBe('👁 0')
  })

  it('renders thumbnail when thumbnail_url exists', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: ['flood'], thumbnail_url: 'http://img.png', sensor: 'SAR', region: 'Seoul', created_at: '2026-01-01' }])

    expect(document.querySelector('.catalog-card-thumb')).not.toBeNull()
    expect(document.querySelector('.catalog-tag').textContent).toBe('flood')
  })

  it('filter inputs trigger onFilterChange', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    mockGetCogImages.mockClear()
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })

    // tag filter
    const tagFilter = document.getElementById('catalog-filter-tag')
    tagFilter.value = 'flood'
    tagFilter.dispatchEvent(new Event('input'))
    await vi.advanceTimersByTimeAsync(300)
    await vi.advanceTimersByTimeAsync(10)

    expect(mockGetCogImages).toHaveBeenCalledWith(expect.objectContaining({ tag: 'flood' }))
  })

  it('clicking a catalog-tag sets tag filter and triggers filtering', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: ['flood', 'sar'], created_at: '2026-01-01' }])
    mockGetCogImages.mockClear()
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })

    const tag = document.querySelector('.catalog-tag')
    expect(tag.textContent).toBe('flood')
    tag.click()

    await vi.advanceTimersByTimeAsync(300)
    await vi.advanceTimersByTimeAsync(10)

    const tagFilter = document.getElementById('catalog-filter-tag')
    expect(tagFilter.value).toBe('flood')
    expect(mockGetCogImages).toHaveBeenCalledWith(expect.objectContaining({ tag: 'flood' }))
  })

  it('clicking a catalog-tag does not open the cog viewer (stopPropagation)', async () => {
    const onSelect = vi.fn()
    await initAndOpen([{ id: '1', url: 'http://example.com/cog.tif', title: 'T', tags: ['flood'], created_at: '2026-01-01' }], onSelect)

    const tag = document.querySelector('.catalog-tag')
    tag.click()

    expect(onSelect).not.toHaveBeenCalled()
    expect(mockIncrementViewCount).not.toHaveBeenCalled()
    expect(document.getElementById('catalog-panel').classList.contains('open')).toBe(true)
  })

  it('source filter triggers onFilterChange on change event', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    mockGetCogImages.mockClear()
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })

    const sourceFilter = document.getElementById('catalog-filter-source')
    sourceFilter.value = 'stac'
    sourceFilter.dispatchEvent(new Event('change'))
    await vi.advanceTimersByTimeAsync(300)
    await vi.advanceTimersByTimeAsync(10)

    expect(mockGetCogImages).toHaveBeenCalledWith(expect.objectContaining({ sourceType: 'stac' }))
  })

  it('year filter triggers onFilterChange on change event', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    mockGetCogImages.mockClear()
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })

    const yearFilter = document.getElementById('catalog-filter-year')
    yearFilter.value = '2025'
    yearFilter.dispatchEvent(new Event('change'))
    await vi.advanceTimersByTimeAsync(300)
    await vi.advanceTimersByTimeAsync(10)

    expect(mockGetCogImages).toHaveBeenCalledWith(expect.objectContaining({ year: '2025' }))
  })

  it('year filter dropdown has dynamic year options', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    const yearFilter = document.getElementById('catalog-filter-year')
    const options = yearFilter.querySelectorAll('option')
    // '전체 연도' + 6 years
    expect(options.length).toBe(7)
    expect(options[0].value).toBe('')
    expect(options[0].textContent).toBe('전체 연도')
  })

  it('prev button does nothing on first page', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    mockGetCogImages.mockClear()

    document.getElementById('catalog-prev').click()
    await vi.advanceTimersByTimeAsync(10)

    expect(mockGetCogImages).not.toHaveBeenCalled()
  })

  it('renders manual source badge for non-stac items', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01', source_type: 'manual' }])
    expect(document.querySelector('.catalog-source-badge.manual').textContent).toBe('수동')
  })

  it('renders stac source badge', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01', source_type: 'stac' }])
    expect(document.querySelector('.catalog-source-badge.stac').textContent).toBe('STAC')
  })

  it('renders card without thumbnail when thumbnail_url is absent', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    expect(document.querySelector('.catalog-card-thumb')).toBeNull()
  })

  it('renders card without description gracefully', async () => {
    await initAndOpen([{ id: '1', title: null, description: null, tags: [], created_at: '2026-01-01' }])
    expect(document.querySelector('.catalog-card-title').textContent).toContain('제목 없음')
  })

  it('authStateChange with null session sets logged out state', async () => {
    mockGetCogImages.mockResolvedValue({ data: [{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }], totalCount: 1, error: null })
    initCatalogUI(vi.fn())
    await vi.advanceTimersByTimeAsync(10)

    const authCallback = mockOnAuthStateChange.mock.calls[0][0]
    authCallback('SIGNED_OUT', null)

    document.getElementById('catalog-toggle-btn').click()
    await vi.advanceTimersByTimeAsync(10)

    expect(document.querySelector('.catalog-card-actions')).toBeNull()
  })

  it('edit modal replaces existing modal', async () => {
    await initAndOpen([{ id: '1', user_id: TEST_USER_ID, title: 'T', tags: [], created_at: '2026-01-01' }])

    // Open first modal
    document.querySelector('.catalog-edit-btn').click()
    await vi.advanceTimersByTimeAsync(10)
    expect(document.getElementById('catalog-edit-modal')).not.toBeNull()

    // Reload and open again - should replace existing
    mockGetCogImages.mockResolvedValue({ data: [{ id: '1', user_id: TEST_USER_ID, title: 'T2', tags: [], created_at: '2026-01-01' }], totalCount: 1, error: null })
    document.getElementById('catalog-toggle-btn').click()
    await vi.advanceTimersByTimeAsync(10)

    document.querySelector('.catalog-edit-btn').click()
    await vi.advanceTimersByTimeAsync(10)

    expect(document.querySelectorAll('#catalog-edit-modal')).toHaveLength(1)
  })

  it('edit modal saves empty title/description as null', async () => {
    mockUpdateCogImage.mockResolvedValue({ error: null })
    await initAndOpen([{ id: '1', user_id: TEST_USER_ID, title: 'T', tags: [], created_at: '2026-01-01' }])

    document.querySelector('.catalog-edit-btn').click()
    await vi.advanceTimersByTimeAsync(10)

    const modal = document.getElementById('catalog-edit-modal')
    modal.querySelector('#edit-title').value = ''
    modal.querySelector('#edit-description').value = ''
    modal.querySelector('#edit-save').click()
    await vi.advanceTimersByTimeAsync(10)

    expect(mockUpdateCogImage).toHaveBeenCalledWith('1', { title: null, description: null })
  })

  it('formatDate handles null/missing date', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: null }])
    // Should not crash, meta should still render
    expect(document.querySelector('.catalog-card-meta')).not.toBeNull()
  })

  it('does not show like count for non-logged-in when count is 0', async () => {
    mockGetSession.mockResolvedValue(null)
    mockGetCogImages.mockResolvedValue({
      data: [{ id: '1', title: 'T', tags: [], created_at: '2026-01-01', likes: [{ count: 0 }] }],
      totalCount: 1,
      error: null,
    })

    initCatalogUI(vi.fn())
    await vi.advanceTimersByTimeAsync(10)
    document.getElementById('catalog-toggle-btn').click()
    await vi.advanceTimersByTimeAsync(10)

    const card = document.querySelector('.catalog-card')
    expect(card.textContent).not.toContain('♥')
  })

  it('returns early when supabase is null', async () => {
    expect(() => initCatalogUI(vi.fn())).not.toThrow()
  })

  it('returns early when panel element is missing', () => {
    document.body.innerHTML = '<button id="catalog-toggle-btn">카탈로그</button>'
    expect(() => initCatalogUI(vi.fn())).not.toThrow()
  })

  it('returns early when toggle button is missing', () => {
    document.body.innerHTML = '<div id="catalog-panel"></div>'
    expect(() => initCatalogUI(vi.fn())).not.toThrow()
  })

  it('share button copies URL to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    await initAndOpen([{ id: '1', url: 'http://example.com/cog.tif', title: 'T', tags: [], created_at: '2026-01-01' }])

    const shareBtn = document.querySelector('.catalog-share-btn')
    expect(shareBtn).not.toBeNull()
    expect(shareBtn.textContent).toBe('🔗 공유')

    shareBtn.click()
    await vi.advanceTimersByTimeAsync(10)

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('?url=http%3A%2F%2Fexample.com%2Fcog.tif'))
    expect(shareBtn.textContent).toBe('✅ 복사됨')

    await vi.advanceTimersByTimeAsync(2000)
    expect(shareBtn.textContent).toBe('🔗 공유')
  })

  it('share button shows failure when clipboard fails', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })

    await initAndOpen([{ id: '1', url: 'http://example.com/cog.tif', title: 'T', tags: [], created_at: '2026-01-01' }])

    const shareBtn = document.querySelector('.catalog-share-btn')
    shareBtn.click()
    await vi.advanceTimersByTimeAsync(10)

    expect(shareBtn.textContent).toBe('❌ 실패')

    await vi.advanceTimersByTimeAsync(2000)
    expect(shareBtn.textContent).toBe('🔗 공유')
  })

  it('share button is shown for non-logged-in users', async () => {
    mockGetSession.mockResolvedValue(null)
    mockGetCogImages.mockResolvedValue({
      data: [{ id: '1', url: 'http://example.com/cog.tif', title: 'T', tags: [], created_at: '2026-01-01' }],
      totalCount: 1,
      error: null,
    })

    initCatalogUI(vi.fn())
    await vi.advanceTimersByTimeAsync(10)
    document.getElementById('catalog-toggle-btn').click()
    await vi.advanceTimersByTimeAsync(10)

    expect(document.querySelector('.catalog-share-btn')).not.toBeNull()
  })

  it('shows only-mine checkbox when logged in', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])

    const onlyMineContainer = document.querySelector('.catalog-only-mine')
    expect(onlyMineContainer).not.toBeNull()
    expect(onlyMineContainer.style.display).toBe('')
  })

  it('hides only-mine checkbox when not logged in', async () => {
    mockGetSession.mockResolvedValue(null)
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })

    initCatalogUI(vi.fn())
    await vi.advanceTimersByTimeAsync(10)

    const onlyMineContainer = document.querySelector('.catalog-only-mine')
    expect(onlyMineContainer.style.display).toBe('none')
  })

  it('only-mine checkbox passes userId to getCogImages', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    mockGetCogImages.mockClear()
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })

    const checkbox = document.getElementById('catalog-filter-only-mine')
    checkbox.checked = true
    checkbox.dispatchEvent(new Event('change'))
    await vi.advanceTimersByTimeAsync(10)

    expect(mockGetCogImages).toHaveBeenCalledWith(expect.objectContaining({ userId: TEST_USER_ID }))
  })

  it('unchecking only-mine checkbox passes empty userId', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    mockGetCogImages.mockClear()
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })

    const checkbox = document.getElementById('catalog-filter-only-mine')
    checkbox.checked = false
    checkbox.dispatchEvent(new Event('change'))
    await vi.advanceTimersByTimeAsync(10)

    expect(mockGetCogImages).toHaveBeenCalledWith(expect.objectContaining({ userId: '' }))
  })

  it('hides only-mine checkbox and unchecks on logout', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])

    const checkbox = document.getElementById('catalog-filter-only-mine')
    checkbox.checked = true

    const authCallback = mockOnAuthStateChange.mock.calls[0][0]
    authCallback('SIGNED_OUT', null)

    const onlyMineContainer = document.querySelector('.catalog-only-mine')
    expect(onlyMineContainer.style.display).toBe('none')
    expect(checkbox.checked).toBe(false)
  })

  it('reset button is hidden when no filters active', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])

    const resetBtn = document.getElementById('catalog-filter-reset')
    expect(resetBtn).not.toBeNull()
    expect(resetBtn.style.display).toBe('none')
  })

  it('reset button appears when a filter is active', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })

    const tagFilter = document.getElementById('catalog-filter-tag')
    tagFilter.value = 'flood'
    tagFilter.dispatchEvent(new Event('input'))
    await vi.advanceTimersByTimeAsync(300)
    await vi.advanceTimersByTimeAsync(10)

    const resetBtn = document.getElementById('catalog-filter-reset')
    expect(resetBtn.style.display).toBe('')
  })

  it('reset button clears all filters and reloads', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })

    // Set multiple filters
    const searchInput = document.getElementById('catalog-search')
    const tagFilter = document.getElementById('catalog-filter-tag')
    const sensorFilter = document.getElementById('catalog-filter-sensor')
    const regionFilter = document.getElementById('catalog-filter-region')
    const sourceFilter = document.getElementById('catalog-filter-source')
    const onlyMine = document.getElementById('catalog-filter-only-mine')

    const yearFilter = document.getElementById('catalog-filter-year')

    searchInput.value = 'test'
    tagFilter.value = 'flood'
    sensorFilter.value = 'SAR'
    regionFilter.value = 'Seoul'
    sourceFilter.value = 'stac'
    yearFilter.value = '2025'
    onlyMine.checked = true

    mockGetCogImages.mockClear()
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })

    const resetBtn = document.getElementById('catalog-filter-reset')
    resetBtn.click()
    await vi.advanceTimersByTimeAsync(10)

    expect(searchInput.value).toBe('')
    expect(tagFilter.value).toBe('')
    expect(sensorFilter.value).toBe('')
    expect(regionFilter.value).toBe('')
    expect(sourceFilter.value).toBe('')
    expect(yearFilter.value).toBe('')
    expect(onlyMine.checked).toBe(false)
    expect(resetBtn.style.display).toBe('none')
    expect(mockGetCogImages).toHaveBeenCalledWith(expect.objectContaining({
      search: '',
      tag: '',
      sensor: '',
      region: '',
      sourceType: '',
      userId: '',
    }))
  })

  it('page size dropdown exists with options 10/20/50', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    const select = document.getElementById('catalog-page-size-select')
    expect(select).not.toBeNull()
    const values = Array.from(select.options).map(o => o.value)
    expect(values).toEqual(['10', '20', '50'])
    expect(select.value).toBe('20')
  })

  it('changing page size reloads with new limit and resets page', async () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: String(i), title: `T${i}`, tags: [], created_at: '2026-01-01' }))
    await initAndOpen(items)

    // Go to page 2 first
    mockGetCogImages.mockResolvedValue({ data: [{ id: '20', title: 'T20', tags: [], created_at: '2026-01-01' }], totalCount: 21, error: null })
    document.getElementById('catalog-next').click()
    await vi.advanceTimersByTimeAsync(10)

    mockGetCogImages.mockClear()
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })

    const select = document.getElementById('catalog-page-size-select')
    select.value = '10'
    select.dispatchEvent(new Event('change'))
    await vi.advanceTimersByTimeAsync(10)

    expect(mockGetCogImages).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, offset: 0 }))
  })

  it('changing page size to 50 passes limit 50', async () => {
    await initAndOpen([{ id: '1', title: 'T', tags: [], created_at: '2026-01-01' }])
    mockGetCogImages.mockClear()
    mockGetCogImages.mockResolvedValue({ data: [], totalCount: 0, error: null })

    const select = document.getElementById('catalog-page-size-select')
    select.value = '50'
    select.dispatchEvent(new Event('change'))
    await vi.advanceTimersByTimeAsync(10)

    expect(mockGetCogImages).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }))
  })

  it('like button handles NaN count gracefully', async () => {
    mockToggleLike.mockResolvedValue({ liked: true, error: null })
    mockGetLikeStates.mockResolvedValue(new Map([['1', { count: 0, liked: false }]]))

    await initAndOpen([{ id: '1', user_id: 'other', title: 'T', tags: [], created_at: '2026-01-01' }])

    const likeBtn = document.querySelector('.catalog-like-btn')
    // Corrupt the count text to trigger NaN branch
    likeBtn.querySelector('.like-count').textContent = ''
    likeBtn.click()
    await vi.advanceTimersByTimeAsync(10)

    // NaN || 0 → 0, liked → 0 + 1 = 1
    expect(likeBtn.querySelector('.like-count').textContent).toBe('1')
  })
})
