import { supabase } from './supabase.js'
import { getCogImages, deleteCogImage, updateCogImage, incrementViewCount } from './catalog.js'
import { toggleLike, getLikeStates } from './likes.js'
import { getSession } from './auth.js'

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
    <select id="catalog-filter-source" class="catalog-filter-input" aria-label="등록 출처 필터">
      <option value="">전체 출처</option>
      <option value="manual">수동 등록</option>
      <option value="stac">STAC 자동</option>
    </select>
  `
  searchInput.parentNode.insertBefore(filterContainer, searchInput.nextSibling)

  const tagFilter = filterContainer.querySelector('#catalog-filter-tag')
  const sensorFilter = filterContainer.querySelector('#catalog-filter-sensor')
  const regionFilter = filterContainer.querySelector('#catalog-filter-region')
  const sourceFilter = filterContainer.querySelector('#catalog-filter-source')

  // 내 영상 필터 (로그인 시에만 표시)
  const onlyMineContainer = document.createElement('div')
  onlyMineContainer.className = 'catalog-only-mine'
  onlyMineContainer.style.display = 'none'
  onlyMineContainer.innerHTML = `
    <label><input type="checkbox" id="catalog-filter-only-mine"> 내 등록 영상만</label>
  `
  filterContainer.parentNode.insertBefore(onlyMineContainer, filterContainer.nextSibling)
  const onlyMineCheckbox = onlyMineContainer.querySelector('#catalog-filter-only-mine')

  // 정렬 드롭다운
  const sortContainer = document.createElement('div')
  sortContainer.className = 'catalog-sort'
  sortContainer.innerHTML = `
    <select id="catalog-sort-select" class="catalog-filter-input" aria-label="정렬 기준">
      <option value="created_at">최신순</option>
      <option value="like_count">인기순</option>
      <option value="view_count">조회수순</option>
    </select>
  `
  onlyMineContainer.parentNode.insertBefore(sortContainer, onlyMineContainer.nextSibling)
  const sortSelect = sortContainer.querySelector('#catalog-sort-select')

  let currentPage = 0
  let searchTerm = ''
  let sortBy = 'created_at'
  let debounceTimer = null
  let isUserLoggedIn = false
  let currentUserId = null

  function updateLoginState(session) {
    isUserLoggedIn = !!session?.user
    currentUserId = session?.user?.id || null
    onlyMineContainer.style.display = isUserLoggedIn ? '' : 'none'
    if (!isUserLoggedIn) {
      onlyMineCheckbox.checked = false
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
  sourceFilter.addEventListener('change', onFilterChange)
  sortSelect.addEventListener('change', () => {
    sortBy = sortSelect.value
    currentPage = 0
    loadPage()
  })
  onlyMineCheckbox.addEventListener('change', () => {
    currentPage = 0
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
    listEl.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">로딩 중...</div>'

    const offset = currentPage * PAGE_SIZE
    const { data, error } = await getCogImages({
      search: searchTerm,
      tag: tagFilter.value.trim(),
      sensor: sensorFilter.value.trim(),
      region: regionFilter.value.trim(),
      sourceType: sourceFilter.value,
      sortBy,
      userId: onlyMineCheckbox.checked ? currentUserId : '',
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

    // 좋아요 상태 일괄 조회
    const ids = data.map(item => item.id)
    const likeStates = await getLikeStates(ids)

    data.forEach(item => {
      const card = document.createElement('div')
      card.className = 'catalog-card'

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

      card.innerHTML = `
        ${thumbHtml}
        <div class="catalog-card-title">${sourceBadge} ${escapeHtml(item.title || '제목 없음')}</div>
        <div class="catalog-card-desc">${escapeHtml(item.description || '')}</div>
        ${tagsHtml}
        <div class="catalog-card-meta">${metaParts.filter(Boolean).join(' | ')}</div>
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

        const watchlistBtn = document.createElement('button')
        watchlistBtn.className = 'catalog-watchlist-btn'
        watchlistBtn.textContent = '+ 관심목록'
        watchlistBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          document.dispatchEvent(new CustomEvent('watchlist-add', { detail: { cogImageId: item.id } }))
        })

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
          deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation()
            if (!confirm('이 영상을 삭제하시겠습니까?')) return
            deleteBtn.disabled = true
            const { error: delError } = await deleteCogImage(item.id)
            if (delError) {
              alert('삭제 실패: ' + delError.message)
              deleteBtn.disabled = false
              return
            }
            loadPage()
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

      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('catalog-tag')) {
          e.stopPropagation()
          tagFilter.value = e.target.textContent
          tagFilter.dispatchEvent(new Event('input'))
          return
        }
        panel.classList.remove('open')
        incrementViewCount(item.id)
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

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
