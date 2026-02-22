import { supabase } from './supabase.js'
import { getCogImages } from './catalog.js'

const PAGE_SIZE = 20

/**
 * 카탈로그 사이드바 UI 초기화
 * @param {(url: string, catalogItem: object) => void} onSelectCog
 */
export function initCatalogUI(onSelectCog) {
  if (!supabase) return

  const toggleBtn = document.getElementById('catalog-toggle-btn')
  const panel = document.getElementById('catalog-panel')
  if (!toggleBtn || !panel) return

  const searchInput = panel.querySelector('#catalog-search')
  const listEl = panel.querySelector('#catalog-list')
  const prevBtn = panel.querySelector('#catalog-prev')
  const nextBtn = panel.querySelector('#catalog-next')
  const pageInfo = panel.querySelector('#catalog-page-info')

  let currentPage = 0
  let searchTerm = ''
  let debounceTimer = null

  toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('open')
    if (panel.classList.contains('open')) {
      loadPage()
    }
  })

  // 패널 닫기 버튼
  const closeBtn = panel.querySelector('#catalog-panel-close')
  if (closeBtn) {
    closeBtn.addEventListener('click', () => panel.classList.remove('open'))
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      searchTerm = searchInput.value.trim()
      currentPage = 0
      loadPage()
    }, 300)
  })

  prevBtn.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--
      loadPage()
    }
  })

  nextBtn.addEventListener('click', () => {
    currentPage++
    loadPage()
  })

  // 등록 이벤트 수신 → 목록 갱신
  document.addEventListener('cog-registered', () => {
    if (panel.classList.contains('open')) {
      currentPage = 0
      loadPage()
    }
  })

  async function loadPage() {
    listEl.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">로딩 중...</div>'

    const offset = currentPage * PAGE_SIZE
    const { data, error } = await getCogImages({
      search: searchTerm,
      limit: PAGE_SIZE,
      offset
    })

    if (error) {
      listEl.innerHTML = `<div style="text-align:center;padding:2rem;color:#dc2626;">${error.message}</div>`
      return
    }

    if (!data || data.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">등록된 영상이 없습니다.</div>'
      prevBtn.disabled = true
      nextBtn.disabled = true
      pageInfo.textContent = ''
      return
    }

    listEl.innerHTML = ''
    data.forEach(item => {
      const card = document.createElement('div')
      card.className = 'catalog-card'
      card.innerHTML = `
        <div class="catalog-card-title">${escapeHtml(item.title || '제목 없음')}</div>
        <div class="catalog-card-desc">${escapeHtml(item.description || '')}</div>
        <div class="catalog-card-meta">${item.crs || ''} | ${formatDate(item.created_at)}</div>
      `
      card.addEventListener('click', () => {
        panel.classList.remove('open')
        onSelectCog(item.url, item)
      })
      listEl.appendChild(card)
    })

    prevBtn.disabled = currentPage === 0
    nextBtn.disabled = data.length < PAGE_SIZE
    pageInfo.textContent = `${currentPage + 1}`
  }
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
