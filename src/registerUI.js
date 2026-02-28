import { supabase } from './supabase.js'
import { getSession } from './auth.js'
import { saveCogImage, generateTitleFromUrl, generateDescriptionFromMeta, generateThumbnail, uploadThumbnail } from './catalog.js'
import { describeImage, isAvailable as isDescriptorAvailable } from './imageDescriptor.js'

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
  modal.style.maxHeight = '90vh'
  modal.style.overflowY = 'auto'

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
  metaInfo.textContent = `CRS: ${meta.crs} | Bands: ${(meta.bands || []).join(',')} (${meta.bandType}) | Size: ${meta.width}×${meta.height}`

  // 제목 (자동 채움)
  const titleInput = document.createElement('input')
  titleInput.className = 'login-modal-input'
  titleInput.placeholder = '제목'
  titleInput.maxLength = 200
  titleInput.value = meta.autoTitle || generateTitleFromUrl(meta.url)

  // 설명 (자동 채움)
  const descInput = document.createElement('textarea')
  descInput.className = 'login-modal-input'
  descInput.placeholder = '설명 (선택)'
  descInput.rows = 2
  descInput.style.resize = 'vertical'
  descInput.value = meta.autoDescription || generateDescriptionFromMeta(meta)

  // AI 설명 생성 버튼
  const aiBtn = document.createElement('button')
  aiBtn.type = 'button'
  aiBtn.className = 'login-modal-submit'
  aiBtn.style.cssText = 'background:#6366f1;font-size:0.8rem;padding:0.4rem 0.8rem;margin-top:-0.25rem;'
  aiBtn.textContent = 'AI 설명 생성'
  if (!isDescriptorAvailable()) {
    aiBtn.disabled = true
    aiBtn.title = '환경변수 미설정 (VITE_IMAGE_DESCRIPTOR_URL)'
    aiBtn.style.opacity = '0.5'
    aiBtn.style.cursor = 'not-allowed'
  }

  aiBtn.addEventListener('click', async () => {
    aiBtn.disabled = true
    aiBtn.textContent = 'AI 분석 중...'
    errorMsg.textContent = ''

    try {
      let coordinates = null
      if (meta.bbox && meta.bbox.length >= 4) {
        coordinates = [(meta.bbox[0] + meta.bbox[2]) / 2, (meta.bbox[1] + meta.bbox[3]) / 2]
      }

      // data URL이면 Supabase Storage에 업로드하여 HTTP URL로 변환
      let thumbParam = thumbnailUrl || undefined
      if (thumbParam && thumbParam.startsWith('data:')) {
        const uploaded = await uploadThumbnail(thumbParam)
        thumbParam = uploaded || undefined
      }

      const result = await describeImage({
        thumbnail: thumbParam,
        coordinates,
        captured_at: capturedInput.value ? new Date(capturedInput.value).toISOString() : (meta.captured_at || undefined),
        bbox: meta.bbox || undefined
      })

      const aiFilledInputs = []
      if (result.description) { descInput.value = result.description; aiFilledInputs.push(descInput) }
      if (result.location?.place_name) { regionInput.value = result.location.place_name; aiFilledInputs.push(regionInput) }
      if (result.land_cover?.classes?.length) {
        const existing = parseTags(tagsInput.value)
        const aiTags = result.land_cover.classes.map(c => c.label).filter(Boolean)
        const merged = [...new Set([...existing, ...aiTags])]
        tagsInput.value = merged.map(t => `#${t}`).join(' ')
        aiFilledInputs.push(tagsInput)
      }
      if (result.context) meta._aiContext = result.context

      aiFilledInputs.forEach(input => { input.style.borderLeft = '3px solid #6366f1' })
      aiBtn.textContent = 'AI 설명 적용됨 ✓'
      setTimeout(() => { aiBtn.textContent = 'AI 설명 생성' }, 3000)
    } catch (err) {
      errorMsg.textContent = err.message
    } finally {
      aiBtn.disabled = false
    }
  })

  // 촬영일시
  const capturedLabel = createLabel('촬영일시 (선택)')
  const capturedInput = document.createElement('input')
  capturedInput.type = 'date'
  capturedInput.className = 'login-modal-input'
  if (meta.captured_at) capturedInput.value = meta.captured_at.slice(0, 10)

  // 지역
  const regionInput = document.createElement('input')
  regionInput.className = 'login-modal-input'
  regionInput.placeholder = '지역 (예: Houston, TX)'
  if (meta.region) regionInput.value = meta.region

  // 센서
  const sensorInput = document.createElement('input')
  sensorInput.className = 'login-modal-input'
  sensorInput.placeholder = '센서 (예: SkySat, Sentinel-2)'
  if (meta.sensor) sensorInput.value = meta.sensor

  // 태그
  const tagsInput = document.createElement('input')
  tagsInput.className = 'login-modal-input'
  tagsInput.placeholder = '태그 (예: #flood #hurricane)'
  if (meta.tags) tagsInput.value = meta.tags.map(t => `#${t}`).join(' ')

  // 썸네일 미리보기
  const thumbPreview = document.createElement('div')
  thumbPreview.style.cssText = 'text-align:center;min-height:40px;'
  thumbPreview.innerHTML = '<span style="font-size:0.75rem;color:#999;">썸네일 생성 중...</span>'

  let thumbnailUrl = meta.thumbnail_url || null

  // 비동기 썸네일 생성
  if (!thumbnailUrl && window.currentTiff) {
    generateThumbnail(window.currentTiff).then(dataUrl => {
      thumbnailUrl = dataUrl
      if (dataUrl) {
        thumbPreview.innerHTML = `<img src="${dataUrl}" style="max-width:128px;max-height:128px;border-radius:4px;border:1px solid #e5e7eb;">`
      } else {
        thumbPreview.innerHTML = '<span style="font-size:0.75rem;color:#999;">썸네일 생성 실패</span>'
      }
    })
  } else if (thumbnailUrl) {
    thumbPreview.innerHTML = `<img src="${thumbnailUrl}" style="max-width:128px;max-height:128px;border-radius:4px;border:1px solid #e5e7eb;">`
  } else {
    thumbPreview.innerHTML = ''
  }

  const errorMsg = document.createElement('p')
  errorMsg.className = 'login-modal-error'

  const submitBtn = document.createElement('button')
  submitBtn.type = 'submit'
  submitBtn.className = 'login-modal-submit'
  submitBtn.textContent = '등록'

  form.appendChild(urlInput)
  form.appendChild(metaInfo)
  form.appendChild(thumbPreview)
  form.appendChild(titleInput)
  form.appendChild(descInput)
  form.appendChild(aiBtn)
  form.appendChild(capturedLabel)
  form.appendChild(capturedInput)
  form.appendChild(regionInput)
  form.appendChild(sensorInput)
  form.appendChild(tagsInput)
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

    const tags = parseTags(tagsInput.value)

    const { error } = await saveCogImage({
      url: meta.url,
      title: titleVal,
      description: descInput.value.trim() || null,
      crs: meta.crs,
      bands: meta.bands,
      bbox: meta.bbox,
      captured_at: capturedInput.value ? new Date(capturedInput.value).toISOString() : null,
      region: regionInput.value.trim() || null,
      sensor: sensorInput.value.trim() || null,
      tags,
      thumbnail_url: thumbnailUrl,
      source_type: meta.source_type || 'manual',
      metadata_json: meta._aiContext ? { ai_context: meta._aiContext } : null
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

  const onEscape = (e) => {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onEscape) }
  }
  document.addEventListener('keydown', onEscape)

  overlay.appendChild(modal)
  document.body.appendChild(overlay)
  titleInput.focus()
}

/**
 * STAC 또는 외부에서 메타데이터가 미리 채워진 등록 모달 열기
 * 로그인 상태를 확인하여 미인증 사용자는 로그인 안내 표시
 */
export async function openRegisterModalWithMeta(meta) {
  const session = await getSession()
  if (!session?.user) {
    alert('카탈로그에 등록하려면 먼저 로그인해주세요.')
    return
  }
  window.currentCogMeta = { ...window.currentCogMeta, ...meta }
  openRegisterModal(window.currentCogMeta)
}

function createLabel(text) {
  const label = document.createElement('label')
  label.style.cssText = 'font-size:0.75rem;color:#666;margin-bottom:-0.5rem;'
  label.textContent = text
  return label
}

function parseTags(input) {
  if (!input) return []
  return input
    .split(/[\s,]+/)
    .map(t => t.replace(/^#/, '').trim())
    .filter(Boolean)
}
