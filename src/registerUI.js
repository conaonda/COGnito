import { supabase } from './supabase.js'
import { getSession } from './auth.js'
import { saveCogImage } from './catalog.js'

/**
 * COG 등록 UI 초기화
 * 로그인 + COG 로드 상태일 때 등록 버튼 활성화
 */
export function initRegisterUI() {
  if (!supabase) return

  const registerBtn = document.getElementById('cog-register-btn')
  if (!registerBtn) return

  let isLoggedIn = false

  registerBtn.style.display = 'none'

  getSession().then(session => {
    isLoggedIn = !!session?.user
    updateRegisterBtn()
  })

  supabase.auth.onAuthStateChange((_event, session) => {
    isLoggedIn = !!session?.user
    updateRegisterBtn()
  })

  document.addEventListener('cog-loaded', () => {
    updateRegisterBtn()
  })

  function updateRegisterBtn() {
    registerBtn.style.display = (isLoggedIn && window.currentCogMeta) ? '' : 'none'
  }

  registerBtn.addEventListener('click', () => {
    if (!window.currentCogMeta) return
    openRegisterModal(window.currentCogMeta)
  })
}

function openRegisterModal(meta) {
  if (document.getElementById('register-modal-overlay')) return

  const overlay = document.createElement('div')
  overlay.id = 'register-modal-overlay'
  overlay.className = 'login-modal-overlay'
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove()
  })

  const modal = document.createElement('div')
  modal.className = 'login-modal'

  const closeBtn = document.createElement('button')
  closeBtn.className = 'login-modal-close'
  closeBtn.textContent = '✕'
  closeBtn.addEventListener('click', () => overlay.remove())
  modal.appendChild(closeBtn)

  const title = document.createElement('h2')
  title.className = 'login-modal-title'
  title.textContent = 'COG 영상 등록'
  modal.appendChild(title)

  const form = document.createElement('form')
  form.className = 'login-modal-form'
  form.addEventListener('submit', (e) => e.preventDefault())

  // URL (읽기전용)
  const urlInput = document.createElement('input')
  urlInput.className = 'login-modal-input'
  urlInput.value = meta.url
  urlInput.readOnly = true
  urlInput.style.opacity = '0.7'

  // 자동 메타데이터 표시
  const metaInfo = document.createElement('div')
  metaInfo.style.cssText = 'font-size:0.75rem;color:#666;line-height:1.5;padding:0.5rem;background:#f9fafb;border-radius:4px;'
  metaInfo.textContent = `CRS: ${meta.crs} | Bands: ${meta.bands.join(',')} (${meta.bandType}) | Size: ${meta.width}×${meta.height}`

  // 제목
  const titleInput = document.createElement('input')
  titleInput.className = 'login-modal-input'
  titleInput.placeholder = '제목'
  titleInput.maxLength = 200

  // 설명
  const descInput = document.createElement('textarea')
  descInput.className = 'login-modal-input'
  descInput.placeholder = '설명 (선택)'
  descInput.rows = 3
  descInput.style.resize = 'vertical'

  const errorMsg = document.createElement('p')
  errorMsg.className = 'login-modal-error'

  const submitBtn = document.createElement('button')
  submitBtn.type = 'submit'
  submitBtn.className = 'login-modal-submit'
  submitBtn.textContent = '등록'

  form.appendChild(urlInput)
  form.appendChild(metaInfo)
  form.appendChild(titleInput)
  form.appendChild(descInput)
  form.appendChild(errorMsg)
  form.appendChild(submitBtn)
  modal.appendChild(form)

  form.addEventListener('submit', async () => {
    const titleVal = titleInput.value.trim()
    if (!titleVal) {
      errorMsg.textContent = '제목을 입력해주세요.'
      return
    }

    errorMsg.textContent = ''
    submitBtn.disabled = true
    submitBtn.textContent = '등록 중...'

    const { error } = await saveCogImage({
      url: meta.url,
      title: titleVal,
      description: descInput.value.trim() || null,
      crs: meta.crs,
      bands: meta.bands,
      bbox: meta.bbox
    })

    if (error) {
      errorMsg.textContent = error.message
      submitBtn.disabled = false
      submitBtn.textContent = '등록'
    } else {
      overlay.remove()
      document.dispatchEvent(new CustomEvent('cog-registered'))
    }
  })

  overlay.appendChild(modal)
  document.body.appendChild(overlay)
  titleInput.focus()
}
