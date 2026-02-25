import { STAC_PRESETS, searchStac, searchStacNext, getStacCollections, extractStacItemMeta, signPlanetaryComputerUrl } from './stac.js'
import Draw, { createBox } from 'ol/interaction/Draw'
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'
import { Style, Stroke, Fill } from 'ol/style'
import GeoJSON from 'ol/format/GeoJSON'

/**
 * STAC 검색 UI 초기화
 * @param {(url: string) => void} onViewCog — 뷰어에서 COG 로드
 * @param {(meta: object) => void} onRegisterCog — 등록 모달 열기 (STAC 메타데이터 포함)
 * @param {() => number[]} getMapBbox — 현재 맵 범위 [minLon, minLat, maxLon, maxLat]
 * @param {import('ol/Map').default} [map] — 맵 인스턴스 (AOI 그리기 지원)
 */
export function initStacUI(onViewCog, onRegisterCog, getMapBbox, map) {
  const stacBtn = document.getElementById('stac-toggle-btn')
  const panel = document.getElementById('stac-panel')
  if (!stacBtn || !panel) return

  const closeBtn = panel.querySelector('#stac-panel-close')
  const presetSelect = panel.querySelector('#stac-preset')
  const customUrlInput = panel.querySelector('#stac-custom-url')
  const collectionSelect = panel.querySelector('#stac-collection')
  const bboxCheckbox = panel.querySelector('#stac-use-bbox')
  const spatialFilter = panel.querySelector('#stac-spatial-filter')
  const dateFrom = panel.querySelector('#stac-date-from')
  const dateTo = panel.querySelector('#stac-date-to')

  // AOI 그리기
  const aoiDrawBtn = panel.querySelector('#stac-aoi-draw')
  const aoiClearBtn = panel.querySelector('#stac-aoi-clear')
  const aoiStatus = panel.querySelector('#stac-aoi-status')

  let aoiSource = null
  let aoiLayer = null
  let aoiDraw = null
  let aoiGeometry = null  // GeoJSON geometry (EPSG:4326)

  if (map) {
    aoiSource = new VectorSource()
    aoiLayer = new VectorLayer({
      source: aoiSource,
      style: new Style({
        stroke: new Stroke({ color: '#667eea', width: 2, lineDash: [6, 4] }),
        fill: new Fill({ color: 'rgba(102,126,234,0.1)' })
      }),
      zIndex: 100
    })
    map.addLayer(aoiLayer)
  }

  function startAoiDraw() {
    if (!map) return
    aoiSource.clear()
    aoiGeometry = null
    if (aoiDraw) map.removeInteraction(aoiDraw)
    aoiDraw = new Draw({ source: aoiSource, type: 'Circle', geometryFunction: createBox() })
    aoiDraw.on('drawend', (e) => {
      map.removeInteraction(aoiDraw)
      aoiDraw = null
      const geojson = new GeoJSON()
      aoiGeometry = geojson.writeGeometryObject(e.feature.getGeometry(), {
        dataProjection: 'EPSG:4326',
        featureProjection: map.getView().getProjection()
      })
      aoiStatus.textContent = 'AOI 설정됨'
      aoiDrawBtn.textContent = '다시 그리기'
    })
    map.addInteraction(aoiDraw)
    aoiStatus.textContent = '맵에서 사각형을 그려주세요'
    aoiDrawBtn.textContent = '그리는 중...'
  }

  function clearAoi() {
    if (aoiDraw && map) { map.removeInteraction(aoiDraw); aoiDraw = null }
    if (aoiSource) aoiSource.clear()
    aoiGeometry = null
    aoiStatus.textContent = ''
    if (aoiDrawBtn) aoiDrawBtn.textContent = '영역 그리기'
  }

  if (aoiDrawBtn) aoiDrawBtn.addEventListener('click', startAoiDraw)
  if (aoiClearBtn) aoiClearBtn.addEventListener('click', clearAoi)

  // bbox 체크 시 공간 필터 드롭다운 표시
  bboxCheckbox.addEventListener('change', () => {
    spatialFilter.style.display = bboxCheckbox.checked ? '' : 'none'
  })
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

  let totalCount = 0
  let currentBbox = null

  function renderFeatures(features) {
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
  }

  function filterContains(features) {
    if (!bboxCheckbox.checked || spatialFilter.value !== 'contains' || !currentBbox) return features
    const [mMinLon, mMinLat, mMaxLon, mMaxLat] = currentBbox
    return features.filter(item => {
      const b = item.bbox
      if (!b || b.length < 4) return false
      return b[0] <= mMinLon && b[1] <= mMinLat && b[2] >= mMaxLon && b[3] >= mMaxLat
    })
  }

  function getNextLink(result) {
    return (result.links || []).find(l => l.rel === 'next')
  }

  function addLoadMoreButton(nextLink) {
    const existing = resultList.querySelector('.stac-load-more')
    if (existing) existing.remove()

    if (!nextLink) return

    const btn = document.createElement('button')
    btn.className = 'stac-search-btn stac-load-more'
    btn.textContent = '더 보기'
    btn.addEventListener('click', async () => {
      btn.disabled = true
      btn.textContent = '로딩 중...'
      try {
        const result = await searchStacNext(nextLink)
        btn.remove()
        const features = filterContains(result.features || [])
        totalCount += features.length
        statusEl.textContent = `${totalCount}개 결과`
        renderFeatures(features)
        addLoadMoreButton(getNextLink(result))
      } catch (err) {
        btn.textContent = '더 보기 실패 — 재시도'
        btn.disabled = false
      }
    })
    resultList.appendChild(btn)
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
    totalCount = 0
    currentBbox = bboxCheckbox.checked ? getMapBbox() : null

    try {
      const params = { apiUrl, limit: 10 }

      const col = collectionSelect.value
      if (col) params.collections = [col]

      if (aoiGeometry) params.intersects = aoiGeometry
      else if (currentBbox) params.bbox = currentBbox

      if (dateFrom.value || dateTo.value) {
        const from = dateFrom.value || '..'
        const to = dateTo.value || '..'
        params.datetime = `${from}/${to}`
      }

      const result = await searchStac(params)
      const features = filterContains(result.features || [])
      totalCount = features.length

      statusEl.textContent = `${totalCount}개 결과`

      if (features.length === 0) {
        resultList.innerHTML = '<div style="text-align:center;padding:1rem;color:#999;">결과 없음</div>'
        return
      }

      renderFeatures(features)
      addLoadMoreButton(getNextLink(result))
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
