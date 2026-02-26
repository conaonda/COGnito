import { supabase } from './supabase.js'
import { getSession } from './auth.js'
import { getWatchlists, createWatchlist, deleteWatchlist, addItem, removeItem, getWatchlistItems } from './watchlist.js'

/**
 * 관심목록 패널 UI 초기화
 * @param {(url: string, catalogItem: object) => void} onSelectCog
 */
export function initWatchlistUI(onSelectCog) {
  if (!supabase) return

  const toggleBtn = document.getElementById('watchlist-toggle-btn')
  const panel = document.getElementById('watchlist-panel')
  if (!toggleBtn || !panel) return

  const closeBtn = panel.querySelector('#watchlist-panel-close')
  const listEl = panel.querySelector('#watchlist-list')
  const createBtn = panel.querySelector('#watchlist-create-btn')

  let isLoggedIn = false
  let selectedWatchlistId = null

  // 로그인 상태에 따라 토글 버튼 표시
  getSession().then(session => {
    isLoggedIn = !!session?.user
    toggleBtn.style.display = isLoggedIn ? '' : 'none'
  })

  supabase.auth.onAuthStateChange((_event, session) => {
    isLoggedIn = !!session?.user
    toggleBtn.style.display = isLoggedIn ? '' : 'none'
  })

  toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('open')
    const isOpen = panel.classList.contains('open')
    toggleBtn.setAttribute('aria-expanded', String(isOpen))
    if (isOpen) {
      selectedWatchlistId = null
      loadWatchlists()
    }
  })

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      panel.classList.remove('open')
      toggleBtn.setAttribute('aria-expanded', 'false')
    })
  }

  createBtn.addEventListener('click', () => {
    openCreateModal()
  })

  // 관심목록에 추가 이벤트 수신
  document.addEventListener('watchlist-add', (e) => {
    const cogImageId = e.detail?.cogImageId
    if (!cogImageId) return
    openAddToWatchlistModal(cogImageId)
  })

  async function loadWatchlists() {
    listEl.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">로딩 중...</div>'

    const { data, error } = await getWatchlists()
    if (error) {
      listEl.innerHTML = `<div style="text-align:center;padding:2rem;color:#dc2626;">${escapeHtml(error.message)}</div>`
      return
    }

    if (!data || data.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">관심목록이 없습니다.</div>'
      return
    }

    listEl.innerHTML = ''
    data.forEach(wl => {
      const item = document.createElement('div')
      item.className = 'watchlist-item'

      const nameEl = document.createElement('span')
      nameEl.className = 'watchlist-item-name'
      nameEl.textContent = wl.name

      const actions = document.createElement('div')
      actions.className = 'watchlist-item-actions'

      const openBtn = document.createElement('button')
      openBtn.textContent = '열기'
      openBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        selectedWatchlistId = wl.id
        loadItems(wl.id, wl.name)
      })

      const delBtn = document.createElement('button')
      delBtn.textContent = '삭제'
      delBtn.className = 'watchlist-delete-btn'
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        if (!confirm(`"${wl.name}" 관심목록을 삭제하시겠습니까?`)) return
        await deleteWatchlist(wl.id)
        loadWatchlists()
      })

      actions.appendChild(openBtn)
      actions.appendChild(delBtn)
      item.appendChild(nameEl)
      item.appendChild(actions)
      listEl.appendChild(item)
    })
  }

  async function loadItems(watchlistId, watchlistName) {
    listEl.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">로딩 중...</div>'

    const { data, error } = await getWatchlistItems(watchlistId)
    if (error) {
      listEl.innerHTML = `<div style="text-align:center;padding:2rem;color:#dc2626;">${escapeHtml(error.message)}</div>`
      return
    }

    listEl.innerHTML = ''

    // 뒤로가기 버튼
    const backBtn = document.createElement('button')
    backBtn.className = 'watchlist-back-btn'
    backBtn.textContent = `← ${escapeHtml(watchlistName)}`
    backBtn.addEventListener('click', () => {
      selectedWatchlistId = null
      loadWatchlists()
    })
    listEl.appendChild(backBtn)

    if (!data || data.length === 0) {
      const empty = document.createElement('div')
      empty.style.cssText = 'text-align:center;padding:2rem;color:#999;'
      empty.textContent = '영상이 없습니다.'
      listEl.appendChild(empty)
      return
    }

    data.forEach(wi => {
      const cog = wi.cog_images
      if (!cog) return

      const card = document.createElement('div')
      card.className = 'catalog-card'

      const titleEl = document.createElement('div')
      titleEl.className = 'catalog-card-title'
      titleEl.textContent = cog.title || '제목 없음'

      const metaEl = document.createElement('div')
      metaEl.className = 'catalog-card-meta'
      metaEl.textContent = cog.crs || ''

      const removeBtn = document.createElement('button')
      removeBtn.className = 'watchlist-remove-item-btn'
      removeBtn.textContent = '제거'
      removeBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        await removeItem(watchlistId, cog.id)
        loadItems(watchlistId, watchlistName)
      })

      card.appendChild(titleEl)
      card.appendChild(metaEl)
      card.appendChild(removeBtn)
      card.addEventListener('click', () => {
        panel.classList.remove('open')
        onSelectCog(cog.url, cog)
      })
      listEl.appendChild(card)
    })
  }

  function openCreateModal() {
    if (document.getElementById('watchlist-create-overlay')) return

    const overlay = document.createElement('div')
    overlay.id = 'watchlist-create-overlay'
    overlay.className = 'login-modal-overlay'
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove()
    })

    const modal = document.createElement('div')
    modal.className = 'login-modal'
    modal.style.width = '300px'

    const closeModalBtn = document.createElement('button')
    closeModalBtn.className = 'login-modal-close'
    closeModalBtn.textContent = '✕'
    closeModalBtn.addEventListener('click', () => overlay.remove())
    modal.appendChild(closeModalBtn)

    const titleEl = document.createElement('h2')
    titleEl.className = 'login-modal-title'
    titleEl.textContent = '관심목록 만들기'
    modal.appendChild(titleEl)

    const form = document.createElement('form')
    form.className = 'login-modal-form'
    form.addEventListener('submit', (e) => e.preventDefault())

    const nameInput = document.createElement('input')
    nameInput.className = 'login-modal-input'
    nameInput.placeholder = '관심목록 이름'
    nameInput.maxLength = 100

    const errorMsg = document.createElement('p')
    errorMsg.className = 'login-modal-error'

    const submitBtn = document.createElement('button')
    submitBtn.type = 'submit'
    submitBtn.className = 'login-modal-submit'
    submitBtn.textContent = '만들기'

    form.appendChild(nameInput)
    form.appendChild(errorMsg)
    form.appendChild(submitBtn)
    modal.appendChild(form)

    form.addEventListener('submit', async () => {
      const name = nameInput.value.trim()
      if (!name) {
        errorMsg.textContent = '이름을 입력해주세요.'
        return
      }
      submitBtn.disabled = true
      const { error } = await createWatchlist(name)
      if (error) {
        errorMsg.textContent = error.message
        submitBtn.disabled = false
      } else {
        overlay.remove()
        loadWatchlists()
      }
    })

    const onEscape = (e) => {
      if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onEscape) }
    }
    document.addEventListener('keydown', onEscape)

    overlay.appendChild(modal)
    document.body.appendChild(overlay)
    nameInput.focus()
  }

  async function openAddToWatchlistModal(cogImageId) {
    if (document.getElementById('watchlist-add-overlay')) return

    const overlay = document.createElement('div')
    overlay.id = 'watchlist-add-overlay'
    overlay.className = 'login-modal-overlay'
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove()
    })

    const modal = document.createElement('div')
    modal.className = 'login-modal'
    modal.style.width = '300px'

    const closeModalBtn = document.createElement('button')
    closeModalBtn.className = 'login-modal-close'
    closeModalBtn.textContent = '✕'
    closeModalBtn.addEventListener('click', () => overlay.remove())
    modal.appendChild(closeModalBtn)

    const titleEl = document.createElement('h2')
    titleEl.className = 'login-modal-title'
    titleEl.textContent = '관심목록에 추가'
    modal.appendChild(titleEl)

    const listContainer = document.createElement('div')
    listContainer.style.cssText = 'max-height:200px;overflow-y:auto;'
    listContainer.innerHTML = '<div style="text-align:center;padding:1rem;color:#999;">로딩 중...</div>'
    modal.appendChild(listContainer)

    const onEscape = (e) => {
      if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onEscape) }
    }
    document.addEventListener('keydown', onEscape)

    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    const { data, error } = await getWatchlists()
    if (error || !data || data.length === 0) {
      listContainer.innerHTML = '<div style="text-align:center;padding:1rem;color:#999;">관심목록이 없습니다. 먼저 관심목록을 만들어주세요.</div>'
      return
    }

    listContainer.innerHTML = ''
    data.forEach(wl => {
      const btn = document.createElement('button')
      btn.style.cssText = 'display:block;width:100%;padding:0.6rem 0.75rem;border:1px solid #e5e7eb;border-radius:6px;background:white;text-align:left;cursor:pointer;margin-bottom:0.5rem;font-size:0.85rem;'
      btn.textContent = wl.name
      btn.addEventListener('click', async () => {
        btn.disabled = true
        btn.textContent = '추가 중...'
        const { error: addError } = await addItem(wl.id, cogImageId)
        if (addError) {
          btn.textContent = addError.message.includes('duplicate') ? '이미 추가됨' : addError.message
          btn.disabled = false
        } else {
          overlay.remove()
        }
      })
      listContainer.appendChild(btn)
    })
  }
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}
