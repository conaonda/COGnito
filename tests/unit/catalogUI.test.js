// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockGetCogImages, mockDeleteCogImage, mockToggleLike, mockGetLikeStates,
  mockGetSession, mockOnAuthStateChange, mockSupabase,
} = vi.hoisted(() => {
  const mockOnAuthStateChange = vi.fn()
  return {
    mockGetCogImages: vi.fn(),
    mockDeleteCogImage: vi.fn(),
    mockToggleLike: vi.fn(),
    mockGetLikeStates: vi.fn(),
    mockGetSession: vi.fn(),
    mockOnAuthStateChange,
    mockSupabase: { auth: { onAuthStateChange: mockOnAuthStateChange } },
  }
})

vi.mock('../../src/supabase.js', () => ({ supabase: mockSupabase }))
vi.mock('../../src/catalog.js', () => ({
  getCogImages: mockGetCogImages,
  deleteCogImage: mockDeleteCogImage,
}))
vi.mock('../../src/likes.js', () => ({
  toggleLike: mockToggleLike,
  getLikeStates: mockGetLikeStates,
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
  })

  async function openPanelWithItems(items) {
    mockGetCogImages.mockResolvedValue({ data: items, error: null })
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

  it('does not show delete button when not logged in', async () => {
    mockGetSession.mockResolvedValue(null)
    mockGetCogImages.mockResolvedValue({
      data: [{ id: '1', user_id: TEST_USER_ID, title: 'Image', tags: [], created_at: '2026-01-01' }],
      error: null,
    })

    initCatalogUI(vi.fn())
    await new Promise(r => setTimeout(r, 10))
    document.getElementById('catalog-toggle-btn').click()
    await new Promise(r => setTimeout(r, 10))

    expect(document.querySelector('.catalog-delete-btn')).toBeNull()
  })
})
