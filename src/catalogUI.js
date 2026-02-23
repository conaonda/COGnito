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

  // 필터 컨트롤 삽입 (검색 입력 아래)
  const filterContainer = document.createElement('div')
  filterContainer.className = 'catalog-filters'
  filterContainer.innerHTML = `
    <input type="text" id="catalog-filter-tag" class="catalog-filter-input" placeholder="태그 필터 (예: flood)">
    <input type="text" id="catalog-filter-sensor" class="catalog-filter-input" placeholder="센서 필터">
    <input type="text" id="catalog-filter-region" class="catalog-filter-input" placeholder="지역 필터">
  `
  searchInput.parentNode.insertBefore(filterContainer, searchInput.nextSibling)

  const tagFilter = filterContainer.querySelector('#catalog-filter-tag')
  const sensorFilter = filterContainer.querySelector('#catalog-filter-sensor')
  const regionFilter = filterContainer.querySelector('#catalog-filter-region')

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

  function onFilterChange() {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      searchTerm = searchInput.value.trim()
      currentPage = 0
      loadPage()
    }, 300)
  }

  searchInput.addEventListener('input', onFilterChange)
  tagFilter.addEventListener('input', onFilterChange)
  sensorFilter.addEventListener('input', onFilterChange)
  regionFilter.addEventListener('input', onFilterChange)

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
      tag: tagFilter.value.trim(),
      sensor: sensorFilter.value.trim(),
      region: regionFilter.value.trim(),
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

      const thumbHtml = item.thumbnail_url
        ? `<img src="${escapeHtml(item.thumbnail_url)}" class="catalog-card-thumb" alt="">`
        : ''

      const tagsHtml = (item.tags && item.tags.length > 0)
        ? `<div class="catalog-card-tags">${item.tags.map(t => `<span class="catalog-tag">${escapeHtml(t)}</span>`).join('')}</div>`
        : ''

      const metaParts = [item.crs || '']
      if (item.sensor) metaParts.push(item.sensor)
      if (item.region) metaParts.push(item.region)
      metaParts.push(formatDate(item.created_at))

      card.innerHTML = `
        ${thumbHtml}
        <div class="catalog-card-title">${escapeHtml(item.title || '제목 없음')}</div>
        <div class="catalog-card-desc">${escapeHtml(item.description || '')}</div>
        ${tagsHtml}
        <div class="catalog-card-meta">${metaParts.filter(Boolean).join(' | ')}</div>
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
