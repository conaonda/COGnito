/**
 * 뷰어 컨트롤 패널 — 밴드 선택, 컬러맵, Min/Max 스트레치, 투영 모드 토글
 */

let onStyleChangeCb = null
let onProjectionChangeCb = null
let currentStats = null
let currentBandInfo = null
let currentTotalBands = 0

export function initViewerControls(onStyleChange, onProjectionChange) {
  onStyleChangeCb = onStyleChange
  onProjectionChangeCb = onProjectionChange

  const panel = document.getElementById('viewer-controls-panel')
  if (!panel) return

  // Min/Max 슬라이더 이벤트
  const minSlider = document.getElementById('vc-min-slider')
  const maxSlider = document.getElementById('vc-max-slider')
  const minVal = document.getElementById('vc-min-value')
  const maxVal = document.getElementById('vc-max-value')
  const resetBtn = document.getElementById('vc-reset-btn')

  if (minSlider) {
    minSlider.addEventListener('input', () => {
      minVal.textContent = Number(minSlider.value).toFixed(1)
      emitStyleChange()
    })
  }
  if (maxSlider) {
    maxSlider.addEventListener('input', () => {
      maxVal.textContent = Number(maxSlider.value).toFixed(1)
      emitStyleChange()
    })
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (!currentStats) return
      minSlider.value = currentStats[0].min
      maxSlider.value = currentStats[0].max
      minVal.textContent = currentStats[0].min.toFixed(1)
      maxVal.textContent = currentStats[0].max.toFixed(1)
      emitStyleChange()
    })
  }

  // 밴드 모드 토글
  const bandModeToggle = document.getElementById('vc-band-mode')
  if (bandModeToggle) {
    bandModeToggle.addEventListener('change', () => {
      updateBandSelectors()
      emitStyleChange()
    })
  }

  // 밴드 선택 드롭다운
  for (const id of ['vc-band-r', 'vc-band-g', 'vc-band-b', 'vc-band-single']) {
    const el = document.getElementById(id)
    if (el) el.addEventListener('change', () => emitStyleChange())
  }

  // 컬러맵 선택
  const colormapSelect = document.getElementById('vc-colormap')
  if (colormapSelect) {
    colormapSelect.addEventListener('change', () => emitStyleChange())
  }

  // 투영 모드 버튼
  const affineBtn = document.getElementById('vc-proj-affine')
  const reprojBtn = document.getElementById('vc-proj-reproject')
  if (affineBtn) {
    affineBtn.addEventListener('click', () => {
      if (!affineBtn.classList.contains('active')) {
        affineBtn.classList.add('active')
        reprojBtn.classList.remove('active')
        if (onProjectionChangeCb) onProjectionChangeCb('affine')
      }
    })
  }
  if (reprojBtn) {
    reprojBtn.addEventListener('click', () => {
      if (!reprojBtn.classList.contains('active')) {
        reprojBtn.classList.add('active')
        affineBtn.classList.remove('active')
        if (onProjectionChangeCb) onProjectionChangeCb('reproject')
      }
    })
  }

  // 패널 토글
  const toggleBtn = document.getElementById('vc-toggle-btn')
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('open')
    })
  }

  // 초기 상태: 비활성
  setControlsEnabled(false)
}

export function updateControlsForCog(totalBands, bandInfo, stats, projectionMode) {
  currentStats = stats
  currentBandInfo = bandInfo
  currentTotalBands = totalBands

  const minSlider = document.getElementById('vc-min-slider')
  const maxSlider = document.getElementById('vc-max-slider')
  const minVal = document.getElementById('vc-min-value')
  const maxVal = document.getElementById('vc-max-value')

  if (minSlider && stats.length > 0) {
    const s = stats[0]
    minSlider.min = s.min
    minSlider.max = s.max
    minSlider.step = (s.max - s.min) / 200
    minSlider.value = s.min
    maxSlider.min = s.min
    maxSlider.max = s.max
    maxSlider.step = (s.max - s.min) / 200
    maxSlider.value = s.max
    minVal.textContent = s.min.toFixed(1)
    maxVal.textContent = s.max.toFixed(1)
  }

  // 밴드 드롭다운 옵션 생성
  populateBandOptions(totalBands, bandInfo)

  // 투영 모드 반영
  const affineBtn = document.getElementById('vc-proj-affine')
  const reprojBtn = document.getElementById('vc-proj-reproject')
  if (affineBtn && reprojBtn) {
    affineBtn.classList.toggle('active', projectionMode === 'affine')
    reprojBtn.classList.toggle('active', projectionMode !== 'affine')
  }

  // 컬러맵: 단일밴드만 활성화
  const colormapSelect = document.getElementById('vc-colormap')
  if (colormapSelect) {
    colormapSelect.value = 'grayscale'
  }

  setControlsEnabled(true)
}

function populateBandOptions(totalBands, bandInfo) {
  const bandModeToggle = document.getElementById('vc-band-mode')
  const rgbGroup = document.getElementById('vc-band-rgb-group')
  const singleGroup = document.getElementById('vc-band-single-group')

  const selectors = ['vc-band-r', 'vc-band-g', 'vc-band-b', 'vc-band-single']
  for (const id of selectors) {
    const sel = document.getElementById(id)
    if (!sel) continue
    sel.innerHTML = ''
    for (let i = 1; i <= totalBands; i++) {
      const opt = document.createElement('option')
      opt.value = i
      opt.textContent = `Band ${i}`
      sel.appendChild(opt)
    }
  }

  // 현재 밴드 설정 반영
  if (bandInfo.type === 'rgb') {
    if (bandModeToggle) bandModeToggle.value = 'rgb'
    const selR = document.getElementById('vc-band-r')
    const selG = document.getElementById('vc-band-g')
    const selB = document.getElementById('vc-band-b')
    if (selR) selR.value = bandInfo.bands[0]
    if (selG) selG.value = bandInfo.bands[1]
    if (selB) selB.value = bandInfo.bands[2]
  } else {
    if (bandModeToggle) bandModeToggle.value = 'single'
    const selSingle = document.getElementById('vc-band-single')
    if (selSingle) selSingle.value = bandInfo.bands[0]
  }

  updateBandSelectors()
}

function updateBandSelectors() {
  const bandMode = document.getElementById('vc-band-mode')
  const rgbGroup = document.getElementById('vc-band-rgb-group')
  const singleGroup = document.getElementById('vc-band-single-group')
  const colormapSelect = document.getElementById('vc-colormap')

  if (!bandMode) return

  const isRgb = bandMode.value === 'rgb'
  if (rgbGroup) rgbGroup.style.display = isRgb ? '' : 'none'
  if (singleGroup) singleGroup.style.display = isRgb ? 'none' : ''
  if (colormapSelect) colormapSelect.disabled = isRgb
}

function setControlsEnabled(enabled) {
  const panel = document.getElementById('viewer-controls-panel')
  if (!panel) return
  const inputs = panel.querySelectorAll('input, select, button:not(#vc-toggle-btn)')
  inputs.forEach(el => { el.disabled = !enabled })
}

export function getCurrentStyle() {
  const bandMode = document.getElementById('vc-band-mode')
  const minSlider = document.getElementById('vc-min-slider')
  const maxSlider = document.getElementById('vc-max-slider')
  const colormapSelect = document.getElementById('vc-colormap')

  const isRgb = bandMode && bandMode.value === 'rgb'
  let bands
  if (isRgb) {
    bands = [
      Number(document.getElementById('vc-band-r')?.value || 1),
      Number(document.getElementById('vc-band-g')?.value || 2),
      Number(document.getElementById('vc-band-b')?.value || 3)
    ]
  } else {
    bands = [Number(document.getElementById('vc-band-single')?.value || 1)]
  }

  return {
    bands,
    bandType: isRgb ? 'rgb' : 'gray',
    colormap: colormapSelect?.value || 'grayscale',
    min: Number(minSlider?.value || 0),
    max: Number(maxSlider?.value || 1)
  }
}

function emitStyleChange() {
  if (onStyleChangeCb) onStyleChangeCb(getCurrentStyle())
}
