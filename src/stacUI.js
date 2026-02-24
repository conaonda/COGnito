import { STAC_PRESETS, searchStac, getStacCollections, extractStacItemMeta, signPlanetaryComputerUrl } from './stac.js'

/**
 * STAC 검색 UI 초기화
 * @param {(url: string) => void} onViewCog — 뷰어에서 COG 로드
 * @param {(meta: object) => void} onRegisterCog — 등록 모달 열기 (STAC 메타데이터 포함)
 * @param {() => number[]} getMapBbox — 현재 맵 범위 [minLon, minLat, maxLon, maxLat]
 */
export function initStacUI(onViewCog, onRegisterCog, getMapBbox) {
  const stacBtn = document.getElementById('stac-toggle-btn')
  const panel = document.getElementById('stac-panel')
  if (!stacBtn || !panel) return

  const closeBtn = panel.querySelector('#stac-panel-close')
  const presetSelect = panel.querySelector('#stac-preset')
  const customUrlInput = panel.querySelector('#stac-custom-url')
  const collectionSelect = panel.querySelector('#stac-collection')
  const bboxCheckbox = panel.querySelector('#stac-use-bbox')
  const dateFrom = panel.querySelector('#stac-date-from')
  const dateTo = panel.querySelector('#stac-date-to')
  const searchBtn = panel.querySelector('#stac-search-btn')
  const resultList = panel.querySelector('#stac-results')
  const statusEl = panel.querySelector('#stac-status')

  stacBtn.addEventListener('click', () => {
    panel.classList.toggle('open')
  })

  closeBtn.addEventListener('click', () => {
    panel.classList.remove('open')
  })

  // 프리셋 변경 시 컬렉션 로드
  presetSelect.addEventListener('change', () => {
    const url = presetSelect.value
    customUrlInput.style.display = url === 'custom' ? '' : 'none'
    if (url && url !== 'custom') {
      loadCollections(url)
    } else {
      collectionSelect.innerHTML = '<option value="">컬렉션 선택...</option>'
    }
  })

  customUrlInput.addEventListener('change', () => {
    const url = customUrlInput.value.trim()
    if (url) loadCollections(url)
  })

  async function loadCollections(apiUrl) {
    collectionSelect.innerHTML = '<option value="">로딩 중...</option>'
    try {
      const collections = await getStacCollections(apiUrl)
      collectionSelect.innerHTML = '<option value="">전체</option>'
      collections.forEach(c => {
        const opt = document.createElement('option')
        opt.value = c.id
        opt.textContent = c.title || c.id
        collectionSelect.appendChild(opt)
      })
    } catch (err) {
      collectionSelect.innerHTML = '<option value="">컬렉션 로드 실패</option>'
      console.warn('STAC 컬렉션 로드 실패:', err)
    }
  }

  searchBtn.addEventListener('click', async () => {
    const apiUrl = presetSelect.value === 'custom'
      ? customUrlInput.value.trim()
      : presetSelect.value

    if (!apiUrl) {
      statusEl.textContent = 'STAC API URL을 선택하세요.'
      return
    }

    statusEl.textContent = '검색 중...'
    resultList.innerHTML = ''
    searchBtn.disabled = true

    try {
      const params = { apiUrl, limit: 10 }

      const col = collectionSelect.value
      if (col) params.collections = [col]

      if (bboxCheckbox.checked) {
        params.bbox = getMapBbox()
      }

      if (dateFrom.value || dateTo.value) {
        const from = dateFrom.value || '..'
        const to = dateTo.value || '..'
        params.datetime = `${from}/${to}`
      }

      const result = await searchStac(params)
      const features = result.features || []

      statusEl.textContent = `${features.length}개 결과`

      if (features.length === 0) {
        resultList.innerHTML = '<div style="text-align:center;padding:1rem;color:#999;">결과 없음</div>'
        return
      }

      features.forEach(item => {
        const meta = extractStacItemMeta(item)
        const card = document.createElement('div')
        card.className = 'stac-result-card'

        const thumbHtml = meta.thumbnail_url
          ? `<img src="${meta.thumbnail_url}" class="stac-result-thumb" alt="">`
          : ''

        card.innerHTML = `
          ${thumbHtml}
          <div class="stac-result-info">
            <div class="stac-result-title">${escapeHtml(meta.title)}</div>
            <div class="stac-result-meta">
              ${meta.sensor ? escapeHtml(meta.sensor) + ' | ' : ''}${meta.captured_at ? meta.captured_at.slice(0, 10) : ''}
            </div>
            <div class="stac-result-actions">
              ${meta.cogUrl ? '<button class="stac-view-btn">뷰어에서 보기</button>' : '<span style="font-size:0.7rem;color:#999;">COG 없음</span>'}
              ${meta.cogUrl ? '<button class="stac-register-btn">카탈로그에 등록</button>' : ''}
            </div>
          </div>
        `

        if (meta.cogUrl) {
          card.querySelector('.stac-view-btn').addEventListener('click', async (e) => {
            e.stopPropagation()
            panel.classList.remove('open')
            const signedUrl = await signPlanetaryComputerUrl(meta.cogUrl, meta.collection)
            onViewCog(signedUrl)
          })

          card.querySelector('.stac-register-btn').addEventListener('click', async (e) => {
            e.stopPropagation()
            const signedUrl = await signPlanetaryComputerUrl(meta.cogUrl, meta.collection)
            onRegisterCog({ ...meta, cogUrl: signedUrl })
          })
        }

        resultList.appendChild(card)
      })
    } catch (err) {
      statusEl.textContent = `검색 실패: ${err.message}`
    } finally {
      searchBtn.disabled = false
    }
  })
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str || ''
  return div.innerHTML
}
