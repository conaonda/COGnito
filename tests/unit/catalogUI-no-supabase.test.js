// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../src/supabase.js', () => ({ supabase: null }))
vi.mock('../../src/catalog.js', () => ({
  getCogImages: vi.fn(),
  deleteCogImage: vi.fn(),
  updateCogImage: vi.fn(),
  DEFAULT_SORT_ORDERS: { created_at: 'desc', like_count: 'desc', view_count: 'desc', captured_at: 'desc', title: 'asc' },
}))
vi.mock('../../src/likes.js', () => ({
  toggleLike: vi.fn(),
  getLikeStates: vi.fn(),
}))
vi.mock('../../src/auth.js', () => ({
  getSession: vi.fn(),
}))

import { initCatalogUI } from '../../src/catalogUI.js'

describe('catalogUI without supabase', () => {
  it('returns early when supabase is null', () => {
    document.body.innerHTML = `
      <button id="catalog-toggle-btn">카탈로그</button>
      <div id="catalog-panel"></div>
    `
    initCatalogUI(vi.fn())
    // Should not set up any listeners — clicking toggle should not open panel
    expect(document.getElementById('catalog-panel').classList.contains('open')).toBe(false)
  })

  it('returns early when toggle button is missing', () => {
    document.body.innerHTML = '<div id="catalog-panel"></div>'
    expect(() => initCatalogUI(vi.fn())).not.toThrow()
  })

  it('returns early when panel is missing', () => {
    document.body.innerHTML = '<button id="catalog-toggle-btn">카탈로그</button>'
    expect(() => initCatalogUI(vi.fn())).not.toThrow()
  })
})
