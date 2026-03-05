import { Map, View } from 'ol'
import LayerGroup from 'ol/layer/Group'
import { apply } from 'ol-mapbox-style'
import { defaults as defaultControls } from 'ol/control'
import { transform } from 'ol/proj'
import { createCOGLayer, buildStyle, getTotalBands, getMinMaxFromOverview, createCOGSource, buildStyleWithColormap } from '@conaonda/ol-cog-layers'
import { createCOGImageLayer } from '@conaonda/ol-cog-layers'
import { extractCogMetadata } from './catalog.js'
import { initAuthUI } from './authUI.js'
import { consumePreLoginState } from './auth.js'
import { proxyCogUrl } from './proxy.js'
import { initRegisterUI, openRegisterModalWithMeta } from './registerUI.js'
import { initCatalogUI } from './catalogUI.js'
import { initStacUI } from './stacUI.js'
import { initWatchlistUI } from './watchlistUI.js'
import { updateViewerMeta } from './viewerMeta.js'
import { initViewerControls, updateControlsForCog, getCurrentStyle } from './viewerControls.js'
import './colormaps.js'
import 'ol/ol.css'

document.getElementById('app-version').textContent = 'v' + __APP_VERSION__

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js')
}

const DEFAULT_COG_URL = 'https://storage.googleapis.com/pdd-stac/disasters/hurricane-harvey/0831/SkySat_20170831T195552Z_RGB.tif'

const preLoginState = consumePreLoginState()

const urlParams = new URLSearchParams(window.location.search)
const COG_URL = urlParams.get('url') || preLoginState?.cogUrl || DEFAULT_COG_URL
let PROJECTION_MODE = urlParams.get('mode') || 'affine'    // 'affine' | 'reproject'
const RENDER_PIPELINE = urlParams.get('render') || 'tile'    // 'tile' | 'image'
const TARGET_TILE_SIZE = parseInt(urlParams.get('tileSize'), 10) || 256
const SHARED_CENTER = urlParams.get('center')  // 'lon,lat'
const SHARED_ZOOM = urlParams.get('zoom')

const MOBILE_MAX_ZOOM = 16
const DEFAULT_MAX_ZOOM = 20
const MOBILE_RES_MULTIPLIER = 4
const isMobile = () => window.innerWidth <= 768
let mobileHighQuality = false

const loadingEl = document.getElementById('loading')
const errorEl = document.getElementById('error')

const showLoading = () => loadingEl.classList.add('active')
const hideLoading = () => loadingEl.classList.remove('active')

const showError = (message) => {
  errorEl.textContent = message
  errorEl.classList.add('active')
  hideLoading()
}

const initMap = async () => {
  initAuthUI()
  const viewProjection = 'EPSG:3857'
  let currentCogLayer = null

  const urlInput = document.getElementById('cog-url-input')
  const loadBtn = document.getElementById('cog-url-load')
  urlInput.value = COG_URL

  const baseGroup = new LayerGroup({ opacity: 0.8 })

  const view = new View({
    projection: viewProjection,
    center: [0, 0],
    zoom: 2,
    maxZoom: isMobile() ? MOBILE_MAX_ZOOM : DEFAULT_MAX_ZOOM
  })

  const map = new Map({
    target: 'map',
    layers: [baseGroup],
    view: view,
    controls: defaultControls({
      zoom: true,
      rotate: true,
      attribution: false
    })
  })

  apply(baseGroup, './style.json')

  const coordDisplay = document.createElement('div')
  coordDisplay.id = 'coordinate-display'
  coordDisplay.style.cssText = `
    position: absolute;
    bottom: 1.5rem;
    right: 1.5rem;
    background: rgba(255,255,255,0.95);
    padding: 0.75rem 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    font-family: monospace;
    font-size: 0.75rem;
    z-index: 10;
    min-width: 200px;
  `
  coordDisplay.innerHTML = `
    <div style="color: #666; margin-bottom: 0.25rem;">지도 좌표:</div>
    <div id="map-coords" style="color: #333; margin-bottom: 0.5rem;">-</div>
    <div style="color: #666; margin-bottom: 0.25rem;">경위도 (WGS84):</div>
    <div id="wgs84-coords" style="color: #333; margin-bottom: 0.5rem;">-</div>
    <div style="color: #666; margin-bottom: 0.25rem;">줌 레벨:</div>
    <div id="zoom-level" style="color: #333;">-</div>
  `
  document.getElementById('app').appendChild(coordDisplay)
  const mapCoordsEl = document.getElementById('map-coords')
  const wgs84CoordsEl = document.getElementById('wgs84-coords')
  const zoomLevelEl = document.getElementById('zoom-level')

  map.on('pointermove', (event) => {
    const coord = event.coordinate

    if (coord) {
      const mapX = coord[0].toFixed(2)
      const mapY = coord[1].toFixed(2)
      mapCoordsEl.textContent = `X: ${mapX}, Y: ${mapY}`

      try {
        const lonLat = transform(coord, viewProjection, 'EPSG:4326')
        const lon = lonLat[0].toFixed(6)
        const lat = lonLat[1].toFixed(6)
        wgs84CoordsEl.textContent = `경도: ${lon}°, 위도: ${lat}°`
      } catch (e) {
        wgs84CoordsEl.textContent = '변환 불가'
      }
    }
  })

  const updateZoom = () => {
    zoomLevelEl.textContent = view.getZoom().toFixed(1)
  }
  map.on('moveend', updateZoom)
  updateZoom()

  const supportsWebGLFloat = () => {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const gl = canvas.getContext('webgl2')
    if (!gl) return false

    // R32F를 framebuffer에 attach하려면 EXT_color_buffer_float 확장이 필요
    gl.getExtension('EXT_color_buffer_float')

    // float 텍스처를 프레임버퍼에 attach해서 실제 렌더링 가능 여부 확인
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, 1, 1, 0, gl.RED, gl.FLOAT, null)
    if (gl.getError() !== gl.NO_ERROR) { gl.deleteTexture(tex); return false }

    const fb = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    gl.deleteTexture(tex)
    gl.deleteFramebuffer(fb)
    return status === gl.FRAMEBUFFER_COMPLETE
  } catch {
    return false
  }
}

let _loadVersion = 0

const loadCOG = async (rawUrl, catalogMeta = null, overrideBandInfo = null, { skipFit = false } = {}) => {
    const thisLoad = ++_loadVersion
    const url = proxyCogUrl(rawUrl)
    showLoading()
    errorEl.classList.remove('active')

    try {
      if (currentCogLayer) {
        map.removeLayer(currentCogLayer)
      }
      let cogLayer, cogSource, extent, tiff

      const pipeline = RENDER_PIPELINE === 'tile' && (isMobile() || !supportsWebGLFloat()) ? 'image' : RENDER_PIPELINE

      if (pipeline === 'image') {
        const resolutionMultiplier = isMobile() && !mobileHighQuality ? MOBILE_RES_MULTIPLIER : 1
        const result = await createCOGImageLayer({ url, projectionMode: PROJECTION_MODE, viewProjection, opacity: 0.8, resolutionMultiplier })
        cogLayer = result.layer
        cogSource = result.source
        extent = result.extent
        tiff = result.tiff
        window._currentImageResult = result
        hideLoading()
      } else {
        const result = await createCOGLayer({ url, bandInfo: overrideBandInfo, projectionMode: PROJECTION_MODE, viewProjection, targetTileSize: TARGET_TILE_SIZE, opacity: 0.8 })
        cogLayer = result.layer
        cogSource = result.source
        extent = result.extent
        tiff = result.tiff
        window._currentImageResult = null

        cogSource.on('change', () => {
          if (cogSource.getState() === 'ready') {
            hideLoading()
          }
          if (cogSource.getState() === 'error') {
            console.error('COG Error:', cogSource.getError())
            showError('COG 영상을 로드하는 중 오류가 발생했습니다.')
          }
        })

        if (cogSource.getState() === 'ready') {
          hideLoading()
        }

        // 연속 줌/팬 중 불필요한 타일 렌더링 억제
        let interacting = false
        map.on('movestart', () => { interacting = true })
        map.on('moveend', () => {
          interacting = false
          cogLayer.changed()
        })
      }

      // stale 요청 무시 (연속 전환 시 이전 결과 폐기)
      if (thisLoad !== _loadVersion) return

      currentCogLayer = cogLayer
      map.addLayer(cogLayer)
      window.cogSource = cogSource

      // 메타데이터 추출 및 저장
      try {
        const cogMeta = await extractCogMetadata(tiff, rawUrl)
        if (thisLoad !== _loadVersion) return
        cogMeta.url = rawUrl
        window.currentCogMeta = cogMeta
        window.currentTiff = tiff
        document.dispatchEvent(new CustomEvent('cog-loaded'))

        // 뷰어 메타데이터 업데이트
        const filename = rawUrl.split('/').pop().split('?')[0]
        const displayMeta = catalogMeta
          ? { title: catalogMeta.title, description: catalogMeta.description, crs: cogMeta.crs, bands: cogMeta.bands, filename }
          : { title: null, crs: cogMeta.crs, bands: cogMeta.bands, filename }
        updateViewerMeta(displayMeta)

        // 뷰어 컨트롤 갱신
        try {
          const totalBands = await getTotalBands(tiff)
          const activeBandInfo = overrideBandInfo || { type: cogMeta.bandType, bands: cogMeta.bands }
          const stats = (await getMinMaxFromOverview(tiff, activeBandInfo.bands)).stats
          updateControlsForCog(totalBands, activeBandInfo, stats, PROJECTION_MODE)
          window._currentViewerState = { url: rawUrl, catalogMeta, stats, bandInfo: activeBandInfo }
          window._viewerControlsReady = true
        } catch (ctrlErr) {
          console.warn('뷰어 컨트롤 갱신 실패:', ctrlErr)
          window._viewerControlsError = ctrlErr?.message || String(ctrlErr)
        }
      } catch (metaErr) {
        console.warn('메타데이터 추출 실패:', metaErr)
        window.currentCogMeta = null
      }

      if (extent && !skipFit) {
        const pad = window.innerWidth <= 768 ? 20 : 50
        map.getView().fit(extent, {
          padding: [pad, pad, pad, pad],
          duration: 1000
        })
      }
    } catch (error) {
      if (thisLoad !== _loadVersion) return
      console.error('COG load error:', error)
      showError(`COG 로드 실패: ${error.message}`)
      window.currentCogMeta = null
      window.currentTiff = null
      window._currentViewerState = null
      window._viewerControlsReady = false
      updateViewerMeta({ title: null, crs: null, bands: null, filename: null })
    }
  }

  // 뷰어 컨트롤 초기화 (loadCOG 전에 호출해야 updateControlsForCog가 정상 동작)
  initViewerControls(
    (style) => {
      // 스타일 변경 핸들러 (min/max, 밴드, 컬러맵)
      const state = window._currentViewerState
      if (!state || !currentCogLayer) return

      const newBandInfo = { type: style.bandType, bands: style.bands }
      const newStats = style.stats

      const bandsChanged = JSON.stringify(style.bands) !== JSON.stringify(state.bandInfo.bands)

      if (bandsChanged) {
        loadCOG(state.url, state.catalogMeta, newBandInfo, { skipFit: true })
        return
      }

      // WebGL 파이프라인: setStyle로 실시간 반영
      if (currentCogLayer.setStyle) {
        currentCogLayer.setStyle(buildStyleWithColormap(newBandInfo, newStats, style.colormap))
      }
      // Canvas 파이프라인: setStats + setColormap로 실시간 반영
      if (window._currentImageResult?.setStats) {
        window._currentImageResult.setStats(newStats)
        window._currentImageResult.setColormap(style.colormap)
      }
    },
    (mode) => {
      // 투영 모드 변경 핸들러
      PROJECTION_MODE = mode
      const state = window._currentViewerState
      if (state) loadCOG(state.url, state.catalogMeta)
    }
  )

  // 초기 COG 로드
  await loadCOG(COG_URL)

  // 공유 URL의 center/zoom 복원
  if (SHARED_CENTER && SHARED_ZOOM) {
    const [lon, lat] = SHARED_CENTER.split(',').map(Number)
    if (isFinite(lon) && isFinite(lat)) {
      view.cancelAnimations()
      view.setCenter(transform([lon, lat], 'EPSG:4326', viewProjection))
      view.setZoom(Number(SHARED_ZOOM))
    }
  } else if (preLoginState?.center && preLoginState?.zoom) {
    // 로그인 전 맵 뷰 복원 (COG fit 애니메이션 취소 후 즉시 적용)
    view.cancelAnimations()
    view.setCenter(preLoginState.center)
    view.setZoom(preLoginState.zoom)
  }

  // UI 이벤트
  loadBtn.addEventListener('click', () => {
    const url = urlInput.value.trim()
    if (url) loadCOG(url)
  })
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const url = urlInput.value.trim()
      if (url) loadCOG(url)
    }
  })

  // 공유 버튼
  document.getElementById('cog-share-btn').addEventListener('click', () => {
    const center = view.getCenter()
    const lonLat = transform(center, viewProjection, 'EPSG:4326')
    const zoom = view.getZoom()
    const cogUrl = urlInput.value.trim() || COG_URL
    const params = new URLSearchParams()
    params.set('url', cogUrl)
    params.set('center', `${lonLat[0].toFixed(6)},${lonLat[1].toFixed(6)}`)
    params.set('zoom', zoom.toFixed(1))
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params}`
    navigator.clipboard.writeText(shareUrl).then(() => {
      const btn = document.getElementById('cog-share-btn')
      btn.textContent = '복사됨!'
      setTimeout(() => { btn.textContent = '공유' }, 2000)
    }).catch(() => {
      prompt('공유 URL:', shareUrl)
    })
  })

  // 모바일 화질 토글
  const qualityToggle = document.getElementById('mobile-quality-toggle')
  const qualityLabel = document.getElementById('quality-label')
  const qualityDot = document.getElementById('quality-dot')
  const warningModal = document.getElementById('quality-warning-modal')

  qualityToggle.addEventListener('click', () => {
    if (mobileHighQuality) {
      mobileHighQuality = false
      qualityLabel.textContent = '저해상도'
      qualityDot.classList.remove('high')
      view.setMaxZoom(MOBILE_MAX_ZOOM)
      loadCOG(urlInput.value.trim() || COG_URL)
    } else {
      warningModal.classList.add('active')
    }
  })

  document.getElementById('quality-cancel').addEventListener('click', () => {
    warningModal.classList.remove('active')
  })

  document.getElementById('quality-confirm').addEventListener('click', () => {
    warningModal.classList.remove('active')
    mobileHighQuality = true
    qualityLabel.textContent = '고해상도'
    qualityDot.classList.add('high')
    view.setMaxZoom(DEFAULT_MAX_ZOOM)
    loadCOG(urlInput.value.trim() || COG_URL)
  })

  initRegisterUI()

  // 패널 토글
  const vcToggleBtn = document.getElementById('vc-toggle-btn')
  const vcPanel = document.getElementById('viewer-controls-panel')
  const vcCloseBtn = document.getElementById('vc-toggle-btn-close')
  if (vcToggleBtn && vcPanel) {
    vcToggleBtn.addEventListener('click', () => vcPanel.classList.add('open'))
  }
  if (vcCloseBtn && vcPanel) {
    vcCloseBtn.addEventListener('click', () => vcPanel.classList.remove('open'))
  }

  initCatalogUI((url, catalogItem) => loadCOG(url, catalogItem))
  initWatchlistUI((url, catalogItem) => loadCOG(url, catalogItem))

  // STAC UI 초기화
  initStacUI(
    (url) => loadCOG(url),
    (stacMeta) => {
      if (stacMeta.cogUrl) {
        loadCOG(stacMeta.cogUrl).then(() => {
          openRegisterModalWithMeta(stacMeta)
        })
      }
    },
    () => {
      const extent = map.getView().calculateExtent(map.getSize())
      const bl = transform([extent[0], extent[1]], viewProjection, 'EPSG:4326')
      const tr = transform([extent[2], extent[3]], viewProjection, 'EPSG:4326')
      return [bl[0], bl[1], tr[0], tr[1]]
    },
    map
  )

  console.log('Map initialized successfully')
  window.olMap = map
}

document.addEventListener('DOMContentLoaded', initMap)
