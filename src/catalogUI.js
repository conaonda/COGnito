import { supabase } from './supabase.js'
import { getCogImages, deleteCogImage, updateCogImage, incrementViewCount, DEFAULT_SORT_ORDERS } from './catalog.js'
import { toggleLike, getLikeStates, getLikedImageIds } from './likes.js'
import { getWatchlistedImageIds } from './watchlist.js'
import { getSession } from './auth.js'

const DEFAULT_PAGE_SIZE = 20

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
    <select id="catalog-filter-source" class="catalog-filter-input" aria-label="등록 출처 필터">
      <option value="">전체 출처</option>
      <option value="manual">수동 등록</option>
      <option value="stac">STAC 자동</option>
    </select>
    <select id="catalog-filter-year" class="catalog-filter-input" aria-label="촬영 연도 필터">
      <option value="">전체 연도</option>
    </select>
  `
  searchInput.parentNode.insertBefore(filterContainer, searchInput.nextSibling)

  const tagFilter = filterContainer.querySelector('#catalog-filter-tag')
  const sensorFilter = filterContainer.querySelector('#catalog-filter-sensor')
  const regionFilter = filterContainer.querySelector('#catalog-filter-region')
  const sourceFilter = filterContainer.querySelector('#catalog-filter-source')
  const yearFilter = filterContainer.querySelector('#catalog-filter-year')

  // 연도 드롭다운 옵션 동적 생성 (현재 연도부터 5년 전까지)
  const currentYear = new Date().getFullYear()
  for (let y = currentYear; y >= currentYear - 5; y--) {
    const opt = document.createElement('option')
    opt.value = String(y)
    opt.textContent = `${y}년`
    yearFilter.appendChild(opt)
  }

  // 필터 초기화 버튼
  const resetBtn = document.createElement('button')
  resetBtn.id = 'catalog-filter-reset'
  resetBtn.className = 'catalog-filter-reset-btn'
  resetBtn.textContent = '필터 초기화'
  resetBtn.style.display = 'none'
  filterContainer.appendChild(resetBtn)

  // 내 영상 필터 (로그인 시에만 표시)
  const onlyMineContainer = document.createElement('div')
  onlyMineContainer.className = 'catalog-only-mine'
  onlyMineContainer.style.display = 'none'
  onlyMineContainer.innerHTML = `
    <label><input type="checkbox" id="catalog-filter-only-mine"> 내 등록 영상만</label>
  `
  filterContainer.parentNode.insertBefore(onlyMineContainer, filterContainer.nextSibling)
  const onlyMineCheckbox = onlyMineContainer.querySelector('#catalog-filter-only-mine')

  // 좋아요한 영상만 보기 필터 (로그인 시에만 표시)
  const likedOnlyContainer = document.createElement('div')
  likedOnlyContainer.className = 'catalog-liked-only'
  likedOnlyContainer.style.display = 'none'
  likedOnlyContainer.innerHTML = `
    <label><input type="checkbox" id="catalog-filter-liked-only"> 좋아요한 영상만</label>
  `
  onlyMineContainer.parentNode.insertBefore(likedOnlyContainer, onlyMineContainer.nextSibling)
  const likedOnlyCheckbox = likedOnlyContainer.querySelector('#catalog-filter-liked-only')

  // 정렬 드롭다운
  const sortContainer = document.createElement('div')
  sortContainer.className = 'catalog-sort'
  sortContainer.innerHTML = `
    <select id="catalog-sort-select" class="catalog-filter-input" aria-label="정렬 기준">
      <option value="created_at">최신순</option>
      <option value="like_count">인기순</option>
      <option value="view_count">조회수순</option>
      <option value="captured_at">촬영일자순</option>
      <option value="title">이름순</option>
    </select>
    <button id="catalog-sort-order-btn" class="catalog-sort-order-btn" type="button" aria-label="정렬 방향 전환" title="정렬 방향 전환">↓</button>
  `
  likedOnlyContainer.parentNode.insertBefore(sortContainer, likedOnlyContainer.nextSibling)
  const sortSelect = sortContainer.querySelector('#catalog-sort-select')
  const sortOrderBtn = sortContainer.querySelector('#catalog-sort-order-btn')

  // 페이지당 영상 수 드롭다운
  const pageSizeContainer = document.createElement('div')
  pageSizeContainer.className = 'catalog-page-size'
  pageSizeContainer.innerHTML = `
    <label>
      <select id="catalog-page-size-select" class="catalog-filter-input" aria-label="페이지당 영상 수">
        <option value="10">10개씩</option>
        <option value="20" selected>20개씩</option>
        <option value="50">50개씩</option>
      </select>
    </label>
  `
  sortContainer.parentNode.insertBefore(pageSizeContainer, sortContainer.nextSibling)
  const pageSizeSelect = pageSizeContainer.querySelector('#catalog-page-size-select')

  // 총 영상 수 표시
  const totalCountEl = document.createElement('div')
  totalCountEl.id = 'catalog-total-count'
  totalCountEl.className = 'catalog-total-count'
  pageSizeContainer.parentNode.insertBefore(totalCountEl, pageSizeContainer.nextSibling)

  // 그리드/리스트 뷰 토글 버튼
  const viewToggleContainer = document.createElement('div')
  viewToggleContainer.className = 'catalog-view-toggle'
  viewToggleContainer.innerHTML = `
    <button type="button" class="catalog-view-btn" data-view="grid" aria-label="그리드 뷰" title="그리드 뷰">⊞</button>
    <button type="button" class="catalog-view-btn" data-view="list" aria-label="리스트 뷰" title="리스트 뷰">≡</button>
  `
  searchInput.parentNode.insertBefore(viewToggleContainer, searchInput.nextSibling)
  // 필터 컨테이너를 뷰 토글 뒤로 이동
  viewToggleContainer.parentNode.insertBefore(filterContainer, viewToggleContainer.nextSibling)

  let viewMode = localStorage.getItem('catalog-view-mode') || 'grid'

  function applyViewMode() {
    listEl.classList.toggle('catalog-list--list-view', viewMode === 'list')
    viewToggleContainer.querySelectorAll('.catalog-view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewMode)
    })
  }

  viewToggleContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.catalog-view-btn')
    if (!btn) return
    viewMode = btn.dataset.view
    localStorage.setItem('catalog-view-mode', viewMode)
    applyViewMode()
  })

  applyViewMode()

  let pageSize = DEFAULT_PAGE_SIZE
  let currentPage = 0
  let searchTerm = ''
  let sortBy = 'created_at'
  let sortOrder = DEFAULT_SORT_ORDERS[sortBy]
  let watchlistAbort = null
  let activeCardId = null

  function updateSortOrderBtn() {
    sortOrderBtn.textContent = sortOrder === 'asc' ? '↑' : '↓'
    sortOrderBtn.title = sortOrder === 'asc' ? '오름차순' : '내림차순'
  }

  // URL 쿼리스트링 → UI 상태 복원
  function readUrlParams() {
    const params = new URLSearchParams(window.location.search)
    if (params.has('search')) searchInput.value = params.get('search')
    if (params.has('tag')) tagFilter.value = params.get('tag')
    if (params.has('sensor')) sensorFilter.value = params.get('sensor')
    if (params.has('region')) regionFilter.value = params.get('region')
    if (params.has('source')) sourceFilter.value = params.get('source')
    if (params.has('year')) yearFilter.value = params.get('year')
    if (params.has('sortBy')) {
      sortBy = params.get('sortBy')
      sortSelect.value = sortBy
    }
    if (params.has('sortOrder')) {
      sortOrder = params.get('sortOrder')
    }
    if (params.get('likedOnly') === 'true') likedOnlyCheckbox.checked = true
    if (params.get('myImagesOnly') === 'true') onlyMineCheckbox.checked = true
    searchTerm = searchInput.value.trim()
    updateSortOrderBtn()
    updateResetBtnVisibility()
  }

  // UI 상태 → URL 쿼리스트링 동기화
  function syncUrlToState() {
    const params = new URLSearchParams(window.location.search)
    const defaults = {
      search: '', tag: '', sensor: '', region: '', source: '', year: '',
      sortBy: 'created_at', sortOrder: DEFAULT_SORT_ORDERS['created_at'],
      likedOnly: 'false', myImagesOnly: 'false'
    }
    const current = {
      search: searchTerm,
      tag: tagFilter.value.trim(),
      sensor: sensorFilter.value.trim(),
      region: regionFilter.value.trim(),
      source: sourceFilter.value,
      year: yearFilter.value,
      sortBy,
      sortOrder,
      likedOnly: String(likedOnlyCheckbox.checked),
      myImagesOnly: String(onlyMineCheckbox.checked)
    }
    for (const [key, val] of Object.entries(current)) {
      if (val !== defaults[key]) {
        params.set(key, val)
      } else {
        params.delete(key)
      }
    }
    const qs = params.toString()
    const newUrl = window.location.pathname + (qs ? '?' + qs : '')
    history.replaceState(null, '', newUrl)
  }

  readUrlParams()

  let debounceTimer = null
  let isUserLoggedIn = false
  let currentUserId = null

  function updateLoginState(session) {
    isUserLoggedIn = !!session?.user
    currentUserId = session?.user?.id || null
    onlyMineContainer.style.display = isUserLoggedIn ? '' : 'none'
    likedOnlyContainer.style.display = isUserLoggedIn ? '' : 'none'
    if (!isUserLoggedIn) {
      onlyMineCheckbox.checked = false
      likedOnlyCheckbox.checked = false
    }
  }

  getSession().then(updateLoginState)
  if (supabase) {
    supabase.auth.onAuthStateChange((_event, session) => {
      updateLoginState(session)
    })
  }

  toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('open')
    const isOpen = panel.classList.contains('open')
    toggleBtn.setAttribute('aria-expanded', String(isOpen))
    if (isOpen) {
      loadPage()
    }
  })

  // 패널 닫기 버튼
  const closeBtn = panel.querySelector('#catalog-panel-close')
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      panel.classList.remove('open')
      toggleBtn.setAttribute('aria-expanded', 'false')
    })
  }

  function hasActiveFilter() {
    return searchInput.value.trim() !== '' ||
      tagFilter.value.trim() !== '' ||
      sensorFilter.value.trim() !== '' ||
      regionFilter.value.trim() !== '' ||
      sourceFilter.value !== '' ||
      yearFilter.value !== '' ||
      onlyMineCheckbox.checked ||
      likedOnlyCheckbox.checked
  }

  function updateResetBtnVisibility() {
    resetBtn.style.display = hasActiveFilter() ? '' : 'none'
  }

  resetBtn.addEventListener('click', () => {
    searchInput.value = ''
    tagFilter.value = ''
    sensorFilter.value = ''
    regionFilter.value = ''
    sourceFilter.value = ''
    yearFilter.value = ''
    onlyMineCheckbox.checked = false
    likedOnlyCheckbox.checked = false
    searchTerm = ''
    currentPage = 0
    updateResetBtnVisibility()
    loadPage()
  })

  function onFilterChange() {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      searchTerm = searchInput.value.trim()
      currentPage = 0
      updateResetBtnVisibility()
      loadPage()
    }, 300)
  }

  searchInput.addEventListener('input', onFilterChange)
  tagFilter.addEventListener('input', onFilterChange)
  sensorFilter.addEventListener('input', onFilterChange)
  regionFilter.addEventListener('input', onFilterChange)
  sourceFilter.addEventListener('change', onFilterChange)
  yearFilter.addEventListener('change', onFilterChange)
  sortSelect.addEventListener('change', () => {
    sortBy = sortSelect.value
    sortOrder = DEFAULT_SORT_ORDERS[sortBy] || 'desc'
    updateSortOrderBtn()
    currentPage = 0
    loadPage()
  })
  sortOrderBtn.addEventListener('click', () => {
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'
    updateSortOrderBtn()
    currentPage = 0
    loadPage()
  })
  pageSizeSelect.addEventListener('change', () => {
    pageSize = Number(pageSizeSelect.value)
    currentPage = 0
    loadPage()
  })
  onlyMineCheckbox.addEventListener('change', () => {
    currentPage = 0
    updateResetBtnVisibility()
    loadPage()
  })
  likedOnlyCheckbox.addEventListener('change', () => {
    currentPage = 0
    updateResetBtnVisibility()
    loadPage()
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
    syncUrlToState()
    listEl.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">로딩 중...</div>'

    const offset = currentPage * pageSize
    const likedIds = likedOnlyCheckbox.checked ? await getLikedImageIds() : null
    const { data, totalCount, error } = await getCogImages({
      search: searchTerm,
      tag: tagFilter.value.trim(),
      sensor: sensorFilter.value.trim(),
      region: regionFilter.value.trim(),
      sourceType: sourceFilter.value,
      year: yearFilter.value,
      sortBy,
      sortOrder,
      userId: onlyMineCheckbox.checked ? currentUserId : '',
      likedIds,
      limit: pageSize,
      offset
    })

    if (error) {
      listEl.innerHTML = `<div style="text-align:center;padding:2rem;color:#dc2626;">${error.message}</div>`
      totalCountEl.textContent = ''
      return
    }

    if (!data || data.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">등록된 영상이 없습니다.</div>'
      prevBtn.disabled = true
      nextBtn.disabled = true
      pageInfo.textContent = ''
      totalCountEl.textContent = '총 0개 영상'
      return
    }

    listEl.innerHTML = ''

    // 이전 watchlist-state-changed 리스너 정리
    if (watchlistAbort) watchlistAbort.abort()
    watchlistAbort = new AbortController()

    // 좋아요·관심목록 상태 일괄 조회
    const ids = data.map(item => item.id)
    const [likeStates, watchlistedIds] = await Promise.all([
      getLikeStates(ids),
      isUserLoggedIn ? getWatchlistedImageIds(ids) : Promise.resolve(new Set())
    ])

    data.forEach(item => {
      const card = document.createElement('div')
      card.className = 'catalog-card' + (activeCardId === item.id ? ' catalog-card--active' : '')

      const thumbHtml = item.thumbnail_url
        ? `<img src="${escapeHtml(item.thumbnail_url)}" class="catalog-card-thumb" alt="${escapeHtml(item.title || '영상')}" loading="lazy" onerror="this.style.display='none'">`
        : ''

      const tagsHtml = (item.tags && item.tags.length > 0)
        ? `<div class="catalog-card-tags">${item.tags.map(t => `<span class="catalog-tag">${escapeHtml(t)}</span>`).join('')}</div>`
        : ''

      const sourceBadge = item.source_type === 'stac'
        ? '<span class="catalog-source-badge stac">STAC</span>'
        : '<span class="catalog-source-badge manual">수동</span>'

      const metaParts = [item.crs || '']
      if (item.sensor) metaParts.push(item.sensor)
      if (item.region) metaParts.push(item.region)
      metaParts.push(formatDate(item.created_at))

      const capturedAtHtml = item.captured_at
        ? `<div class="catalog-card-captured">📷 ${formatDate(item.captured_at)}</div>`
        : ''

      const resolutionHtml = item.resolution != null
        ? `<div class="catalog-card-resolution">📐 ${item.resolution}m</div>`
        : ''

      card.innerHTML = `
        <div class="catalog-card-body">
          ${thumbHtml}
          <div class="catalog-card-info">
            <div class="catalog-card-title">${sourceBadge} ${highlightText(item.title || '제목 없음', searchTerm)}</div>
            <div class="catalog-card-desc">${highlightText(item.description || '', searchTerm)}</div>
            ${tagsHtml}
            ${capturedAtHtml}
            ${resolutionHtml}
            <div class="catalog-card-meta">${metaParts.filter(Boolean).join(' | ')}</div>
          </div>
        </div>
      `

      // 좋아요 + 관심목록 버튼 (로그인 시만 표시)
      if (isUserLoggedIn) {
        const likeState = likeStates.get(item.id) || { count: 0, liked: false }
        const actionsRow = document.createElement('div')
        actionsRow.className = 'catalog-card-actions'

        const likeBtn = document.createElement('button')
        likeBtn.className = 'catalog-like-btn' + (likeState.liked ? ' liked' : '')
        likeBtn.innerHTML = `<span class="like-heart">${likeState.liked ? '&#9829;' : '&#9825;'}</span> <span class="like-count">${likeState.count}</span>`
        likeBtn.addEventListener('click', async (e) => {
          e.stopPropagation()
          likeBtn.disabled = true
          const { liked, error: likeError } = await toggleLike(item.id)
          if (!likeError) {
            const countEl = likeBtn.querySelector('.like-count')
            const heartEl = likeBtn.querySelector('.like-heart')
            const prevCount = parseInt(countEl.textContent, 10) || 0
            countEl.textContent = liked ? prevCount + 1 : Math.max(0, prevCount - 1)
            heartEl.innerHTML = liked ? '&#9829;' : '&#9825;'
            likeBtn.classList.toggle('liked', liked)
          }
          likeBtn.disabled = false
        })

        const isWatchlisted = watchlistedIds.has(item.id)
        const watchlistBtn = document.createElement('button')
        watchlistBtn.className = 'catalog-watchlist-btn' + (isWatchlisted ? ' watchlisted' : '')
        watchlistBtn.textContent = isWatchlisted ? '✓ 관심목록' : '+ 관심목록'
        watchlistBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          if (watchlistBtn.classList.contains('watchlisted')) {
            document.dispatchEvent(new CustomEvent('watchlist-remove', { detail: { cogImageId: item.id } }))
          } else {
            document.dispatchEvent(new CustomEvent('watchlist-add', { detail: { cogImageId: item.id } }))
          }
        })
        document.addEventListener('watchlist-state-changed', (e) => {
          if (e.detail?.cogImageId !== item.id) return
          const added = e.detail.watchlisted
          watchlistBtn.classList.toggle('watchlisted', added)
          watchlistBtn.textContent = added ? '✓ 관심목록' : '+ 관심목록'
        }, { signal: watchlistAbort.signal })

        actionsRow.appendChild(likeBtn)
        actionsRow.appendChild(watchlistBtn)

        if (currentUserId && item.user_id === currentUserId) {
          const editBtn = document.createElement('button')
          editBtn.className = 'catalog-edit-btn'
          editBtn.textContent = '편집'
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            showEditModal(item, loadPage)
          })
          actionsRow.appendChild(editBtn)

          const deleteBtn = document.createElement('button')
          deleteBtn.className = 'catalog-delete-btn'
          deleteBtn.textContent = '삭제'
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            showDeleteModal(item, loadPage)
          })
          actionsRow.appendChild(deleteBtn)
        }

        card.appendChild(actionsRow)
      } else {
        // 비로그인: 좋아요 수만 표시
        const likeCount = item.likes?.[0]?.count || 0
        if (likeCount > 0) {
          const likeInfo = document.createElement('div')
          likeInfo.className = 'catalog-card-meta'
          likeInfo.textContent = `♥ ${likeCount}`
          card.appendChild(likeInfo)
        }
      }

      // 지도로 이동 버튼 (bbox가 있는 경우만 표시)
      if (item.bbox) {
        const fitBboxBtn = document.createElement('button')
        fitBboxBtn.className = 'catalog-fit-bbox-btn'
        fitBboxBtn.textContent = '🗺️ 지도로 이동'
        fitBboxBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          document.dispatchEvent(new CustomEvent('catalog-fit-bbox', { detail: { bbox: item.bbox } }))
        })
        card.appendChild(fitBboxBtn)
      }

      // 공유 버튼 (모든 사용자에게 표시)
      const shareBtn = document.createElement('button')
      shareBtn.className = 'catalog-share-btn'
      shareBtn.textContent = '🔗 공유'
      shareBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const shareUrl = `${location.origin}${location.pathname}?url=${encodeURIComponent(item.url)}`
        try {
          await navigator.clipboard.writeText(shareUrl)
          shareBtn.textContent = '✅ 복사됨'
          setTimeout(() => { shareBtn.textContent = '🔗 공유' }, 2000)
        } catch {
          shareBtn.textContent = '❌ 실패'
          setTimeout(() => { shareBtn.textContent = '🔗 공유' }, 2000)
        }
      })
      card.appendChild(shareBtn)

      // 조회수 표시
      const viewCountEl = document.createElement('span')
      viewCountEl.className = 'catalog-view-count'
      viewCountEl.textContent = `👁 ${item.view_count || 0}`
      card.appendChild(viewCountEl)

      // hover 시 bbox 하이라이트 표시
      if (item.bbox) {
        card.addEventListener('mouseenter', () => {
          document.dispatchEvent(new CustomEvent('catalog-card-mouseenter', { detail: { bbox: item.bbox } }))
        })
        card.addEventListener('mouseleave', () => {
          document.dispatchEvent(new CustomEvent('catalog-card-mouseleave'))
        })
      }

      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('catalog-tag')) {
          e.stopPropagation()
          tagFilter.value = e.target.textContent
          tagFilter.dispatchEvent(new Event('input'))
          return
        }
        // 이전 활성 카드 해제, 새 카드 활성화
        const prevActive = listEl.querySelector('.catalog-card--active')
        if (prevActive) prevActive.classList.remove('catalog-card--active')
        card.classList.add('catalog-card--active')
        activeCardId = item.id
        panel.classList.remove('open')
        incrementViewCount(item.id)
        onSelectCog(item.url, item)
      })
      listEl.appendChild(card)
    })

    prevBtn.disabled = currentPage === 0
    nextBtn.disabled = data.length < pageSize
    pageInfo.textContent = `${currentPage + 1}`
    totalCountEl.textContent = `총 ${totalCount}개 영상`
  }
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function highlightText(text, query) {
  if (!query) return escapeHtml(text)
  const escaped = escapeHtml(text)
  const escapedQuery = escapeHtml(query)
  const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return escaped.replace(regex, '<mark>$1</mark>')
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function showEditModal(item, onSave) {
  // 기존 모달 제거
  const existing = document.getElementById('catalog-edit-modal')
  if (existing) existing.remove()

  const overlay = document.createElement('div')
  overlay.id = 'catalog-edit-modal'
  overlay.className = 'catalog-edit-overlay'
  overlay.innerHTML = `
    <div class="catalog-edit-dialog">
      <h3>영상 정보 편집</h3>
      <label>제목<input type="text" id="edit-title" value="${escapeAttr(item.title || '')}"></label>
      <label>설명<textarea id="edit-description" rows="3">${escapeHtml(item.description || '')}</textarea></label>
      <div class="catalog-edit-actions">
        <button id="edit-cancel" type="button">취소</button>
        <button id="edit-save" type="button">저장</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  overlay.querySelector('#edit-cancel').addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove()
  })

  overlay.querySelector('#edit-save').addEventListener('click', async () => {
    const title = overlay.querySelector('#edit-title').value.trim()
    const description = overlay.querySelector('#edit-description').value.trim()
    const saveBtn = overlay.querySelector('#edit-save')
    saveBtn.disabled = true
    const { error } = await updateCogImage(item.id, { title: title || null, description: description || null })
    if (error) {
      alert('수정 실패: ' + error.message)
      saveBtn.disabled = false
      return
    }
    overlay.remove()
    onSave()
  })
}

function showDeleteModal(item, onDelete) {
  const existing = document.getElementById('catalog-delete-modal')
  if (existing) existing.remove()

  const overlay = document.createElement('div')
  overlay.id = 'catalog-delete-modal'
  overlay.className = 'catalog-edit-overlay'
  overlay.innerHTML = `
    <div class="catalog-edit-dialog">
      <h3>영상 삭제</h3>
      <p class="catalog-delete-message">"${escapeHtml(item.title || '제목 없음')}" 영상을 삭제하시겠습니까?</p>
      <div class="catalog-delete-error" style="display:none;color:#dc2626;font-size:0.85rem;margin-top:0.5rem;"></div>
      <div class="catalog-edit-actions">
        <button id="delete-cancel" type="button">취소</button>
        <button id="delete-confirm" type="button" class="catalog-delete-confirm-btn">삭제</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  overlay.querySelector('#delete-cancel').addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove()
  })

  overlay.querySelector('#delete-confirm').addEventListener('click', async () => {
    const confirmBtn = overlay.querySelector('#delete-confirm')
    confirmBtn.disabled = true
    const { error } = await deleteCogImage(item.id)
    if (error) {
      const errorEl = overlay.querySelector('.catalog-delete-error')
      errorEl.textContent = '삭제 실패: ' + error.message
      errorEl.style.display = 'block'
      confirmBtn.disabled = false
      return
    }
    overlay.remove()
    onDelete()
  })
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
