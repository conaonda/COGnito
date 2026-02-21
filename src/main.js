import { Map, View } from 'ol'
import LayerGroup from 'ol/layer/Group'
import { apply } from 'ol-mapbox-style'
import { defaults as defaultControls } from 'ol/control'
import { transform } from 'ol/proj'
import { createCOGLayer } from './cogLayer.js'
import { createCOGImageLayer } from './cogImageLayer.js'
import 'ol/ol.css'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js')
}

const DEFAULT_COG_URL = 'https://storage.googleapis.com/pdd-stac/disasters/hurricane-harvey/0831/SkySat_20170831T195552Z_RGB.tif'

const urlParams = new URLSearchParams(window.location.search)
const COG_URL = urlParams.get('url') || DEFAULT_COG_URL
const PROJECTION_MODE = urlParams.get('mode') || 'affine'    // 'affine' | 'reproject'
const RENDER_PIPELINE = urlParams.get('render') || 'tile'    // 'tile' | 'image'
const TARGET_TILE_SIZE = parseInt(urlParams.get('tileSize'), 10) || 256

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
      attribution: true
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
    <div id="wgs84-coords" style="color: #333;">-</div>
  `
  document.getElementById('app').appendChild(coordDisplay)
  const mapCoordsEl = document.getElementById('map-coords')
  const wgs84CoordsEl = document.getElementById('wgs84-coords')

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

const loadCOG = async (url) => {
    showLoading()
    errorEl.classList.remove('active')

    try {
      if (currentCogLayer) {
        map.removeLayer(currentCogLayer)
      }
      let cogLayer, cogSource, extent

      const pipeline = RENDER_PIPELINE === 'tile' && !supportsWebGLFloat() ? 'image' : RENDER_PIPELINE

      if (pipeline === 'image') {
        const resolutionMultiplier = isMobile() && !mobileHighQuality ? MOBILE_RES_MULTIPLIER : 1
        const result = await createCOGImageLayer({ url, projectionMode: PROJECTION_MODE, viewProjection, opacity: 0.8, resolutionMultiplier })
        cogLayer = result.layer
        cogSource = result.source
        extent = result.extent
        hideLoading()
      } else {
        const result = await createCOGLayer({ url, projectionMode: PROJECTION_MODE, viewProjection, targetTileSize: TARGET_TILE_SIZE, opacity: 0.8 })
        cogLayer = result.layer
        cogSource = result.source
        extent = result.extent

        cogSource.on('change', () => {
          if (cogSource.getState() === 'ready') {
            hideLoading()
          }
          if (cogSource.getState() === 'error') {
            const error = cogSource.getError()
            console.error('COG Error:', error)
            showError('COG 영상을 로드하는 중 오류가 발생했습니다.')
          }
        })

        if (cogSource.getState() === 'ready') {
          hideLoading()
        }
      }

      currentCogLayer = cogLayer
      map.addLayer(cogLayer)
      window.cogSource = cogSource

      if (extent) {
        const pad = window.innerWidth <= 768 ? 20 : 50
        map.getView().fit(extent, {
          padding: [pad, pad, pad, pad],
          duration: 1000
        })
      }
    } catch (error) {
      console.error('COG load error:', error)
      showError(`COG 로드 실패: ${error.message}`)
    }
  }

  // 초기 COG 로드
  await loadCOG(COG_URL)

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

  console.log('Map initialized successfully')
  window.olMap = map
}

document.addEventListener('DOMContentLoaded', initMap)
