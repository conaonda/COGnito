/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

function setupDOM() {
  document.body.innerHTML = `
    <div id="viewer-controls-panel">
      <select id="vc-band-mode">
        <option value="rgb">RGB</option>
        <option value="single">단일 밴드</option>
      </select>
      <div id="vc-band-rgb-group">
        <select id="vc-band-r"></select>
        <select id="vc-band-g"></select>
        <select id="vc-band-b"></select>
      </div>
      <div id="vc-band-single-group" style="display:none">
        <select id="vc-band-single"></select>
      </div>
      <div class="vc-stretch-mode">
        <input type="radio" name="vc-stretch-mode" value="batch" checked>
        <input type="radio" name="vc-stretch-mode" value="perband">
      </div>
      <div id="vc-stretch-batch">
        <input type="range" id="vc-min-slider" min="0" max="255" value="0">
        <input type="range" id="vc-max-slider" min="0" max="255" value="255">
        <span id="vc-min-value">0</span>
        <span id="vc-max-value">255</span>
      </div>
      <div id="vc-stretch-perband" style="display:none">
        <div class="vc-perband-channel" data-channel="R">
          <input type="range" class="vc-perband-min" min="0" max="255" value="0">
          <input type="range" class="vc-perband-max" min="0" max="255" value="255">
          <span class="vc-perband-min-value">0</span>
          <span class="vc-perband-max-value">255</span>
        </div>
        <div class="vc-perband-channel" data-channel="G">
          <input type="range" class="vc-perband-min" min="0" max="255" value="0">
          <input type="range" class="vc-perband-max" min="0" max="255" value="255">
          <span class="vc-perband-min-value">0</span>
          <span class="vc-perband-max-value">255</span>
        </div>
        <div class="vc-perband-channel" data-channel="B">
          <input type="range" class="vc-perband-min" min="0" max="255" value="0">
          <input type="range" class="vc-perband-max" min="0" max="255" value="255">
          <span class="vc-perband-min-value">0</span>
          <span class="vc-perband-max-value">255</span>
        </div>
      </div>
      <select id="vc-colormap"><option value="grayscale">Grayscale</option></select>
      <button id="vc-reset-btn">자동</button>
      <button id="vc-proj-affine">Affine</button>
      <button id="vc-proj-reproject">Reproject</button>
      <button id="vc-toggle-btn">⚙</button>
    </div>
  `
}

describe('viewerControls', () => {
  let initViewerControls, updateControlsForCog, getCurrentStyle

  beforeEach(async () => {
    vi.resetModules()
    setupDOM()
    const mod = await import('../../src/viewerControls.js')
    initViewerControls = mod.initViewerControls
    updateControlsForCog = mod.updateControlsForCog
    getCurrentStyle = mod.getCurrentStyle
  })

  it('getCurrentStyle returns RGB bands from dropdowns', () => {
    initViewerControls(vi.fn(), vi.fn())
    updateControlsForCog(6, { type: 'rgb', bands: [4, 3, 2] }, [
      { min: 0, max: 100 }, { min: 0, max: 100 }, { min: 0, max: 100 }
    ], 'affine')

    const style = getCurrentStyle()
    expect(style.bandType).toBe('rgb')
    expect(style.bands).toEqual([4, 3, 2])
  })

  it('getCurrentStyle returns single band after mode switch', () => {
    initViewerControls(vi.fn(), vi.fn())
    updateControlsForCog(6, { type: 'gray', bands: [5] }, [
      { min: 10, max: 200 }
    ], 'affine')

    const style = getCurrentStyle()
    expect(style.bandType).toBe('gray')
    expect(style.bands).toEqual([5])
  })

  it('band dropdowns populated with correct number of options', () => {
    initViewerControls(vi.fn(), vi.fn())
    updateControlsForCog(8, { type: 'rgb', bands: [1, 2, 3] }, [
      { min: 0, max: 1 }, { min: 0, max: 1 }, { min: 0, max: 1 }
    ], 'affine')

    const selR = document.getElementById('vc-band-r')
    expect(selR.options.length).toBe(8)
    expect(selR.options[0].textContent).toBe('Band 1')
    expect(selR.options[7].textContent).toBe('Band 8')
  })

  it('emits style change on band dropdown change', () => {
    const onStyleChange = vi.fn()
    initViewerControls(onStyleChange, vi.fn())
    updateControlsForCog(6, { type: 'rgb', bands: [1, 2, 3] }, [
      { min: 0, max: 100 }, { min: 0, max: 100 }, { min: 0, max: 100 }
    ], 'affine')

    const selR = document.getElementById('vc-band-r')
    selR.value = '4'
    selR.dispatchEvent(new Event('change'))

    expect(onStyleChange).toHaveBeenCalledTimes(1)
    expect(onStyleChange.mock.calls[0][0].bands[0]).toBe(4)
  })

  it('colormap disabled in RGB mode, enabled in single mode', () => {
    initViewerControls(vi.fn(), vi.fn())
    updateControlsForCog(6, { type: 'rgb', bands: [1, 2, 3] }, [
      { min: 0, max: 1 }, { min: 0, max: 1 }, { min: 0, max: 1 }
    ], 'affine')

    const colormapSelect = document.getElementById('vc-colormap')
    expect(colormapSelect.disabled).toBe(true)

    updateControlsForCog(6, { type: 'gray', bands: [1] }, [
      { min: 0, max: 1 }
    ], 'affine')
    expect(colormapSelect.disabled).toBe(false)
  })

  it('switching band mode toggles RGB/single group visibility', () => {
    initViewerControls(vi.fn(), vi.fn())
    updateControlsForCog(6, { type: 'rgb', bands: [1, 2, 3] }, [
      { min: 0, max: 1 }, { min: 0, max: 1 }, { min: 0, max: 1 }
    ], 'affine')

    const rgbGroup = document.getElementById('vc-band-rgb-group')
    const singleGroup = document.getElementById('vc-band-single-group')

    expect(rgbGroup.style.display).toBe('')
    expect(singleGroup.style.display).toBe('none')

    // Switch to single
    const bandMode = document.getElementById('vc-band-mode')
    bandMode.value = 'single'
    bandMode.dispatchEvent(new Event('change'))

    expect(rgbGroup.style.display).toBe('none')
    expect(singleGroup.style.display).toBe('')
  })

  describe('populateBandOptions', () => {
    it('RGB 모드: 각 드롭다운에 totalBands 개의 옵션을 생성하고 선택값 반영', () => {
      initViewerControls(vi.fn(), vi.fn())
      updateControlsForCog(4, { type: 'rgb', bands: [3, 2, 1] }, [
        { min: 0, max: 1 }, { min: 0, max: 1 }, { min: 0, max: 1 }
      ], 'affine')

      const selR = document.getElementById('vc-band-r')
      const selG = document.getElementById('vc-band-g')
      const selB = document.getElementById('vc-band-b')

      expect(selR.options.length).toBe(4)
      expect(selG.options.length).toBe(4)
      expect(selB.options.length).toBe(4)
      expect(selR.value).toBe('3')
      expect(selG.value).toBe('2')
      expect(selB.value).toBe('1')
    })

    it('단일밴드 모드: single 드롭다운에 옵션 생성 및 선택값 반영', () => {
      initViewerControls(vi.fn(), vi.fn())
      updateControlsForCog(5, { type: 'gray', bands: [4] }, [
        { min: 0, max: 1 }
      ], 'affine')

      const selSingle = document.getElementById('vc-band-single')
      expect(selSingle.options.length).toBe(5)
      expect(selSingle.value).toBe('4')
      expect(selSingle.options[0].textContent).toBe('Band 1')
      expect(selSingle.options[4].textContent).toBe('Band 5')
    })
  })

  describe('getCurrentStyle', () => {
    it('RGB 모드에서 일괄 스트레치 stats를 3채널로 복제', () => {
      initViewerControls(vi.fn(), vi.fn())
      updateControlsForCog(3, { type: 'rgb', bands: [1, 2, 3] }, [
        { min: 10, max: 200 }, { min: 10, max: 200 }, { min: 10, max: 200 }
      ], 'affine')

      const style = getCurrentStyle()
      expect(style.stats).toHaveLength(3)
      expect(style.stats[0]).toEqual(style.stats[1])
      expect(style.min).toBe(10)
      expect(style.max).toBe(200)
    })

    it('단일밴드 모드에서 stats 1개 반환 및 colormap 포함', () => {
      initViewerControls(vi.fn(), vi.fn())
      updateControlsForCog(3, { type: 'gray', bands: [2] }, [
        { min: 5, max: 50 }
      ], 'affine')

      const style = getCurrentStyle()
      expect(style.stats).toHaveLength(1)
      expect(style.bandType).toBe('gray')
      expect(style.colormap).toBe('grayscale')
    })
  })

  describe('updateStretchModeVisibility', () => {
    it('RGB일 때 스트레치 모드 선택 표시', () => {
      initViewerControls(vi.fn(), vi.fn())
      updateControlsForCog(3, { type: 'rgb', bands: [1, 2, 3] }, [
        { min: 0, max: 1 }, { min: 0, max: 1 }, { min: 0, max: 1 }
      ], 'affine')

      const stretchModeDiv = document.querySelector('.vc-stretch-mode')
      expect(stretchModeDiv.style.display).toBe('flex')
    })

    it('단일밴드일 때 스트레치 모드 숨기고 일괄 모드로 강제 전환', () => {
      initViewerControls(vi.fn(), vi.fn())
      // 먼저 RGB로 설정하여 perband 라디오를 선택
      updateControlsForCog(3, { type: 'rgb', bands: [1, 2, 3] }, [
        { min: 0, max: 1 }, { min: 0, max: 1 }, { min: 0, max: 1 }
      ], 'affine')

      const perbandRadio = document.querySelector('input[name="vc-stretch-mode"][value="perband"]')
      perbandRadio.checked = true

      // 단일밴드로 전환
      updateControlsForCog(3, { type: 'gray', bands: [1] }, [
        { min: 0, max: 1 }
      ], 'affine')

      const stretchModeDiv = document.querySelector('.vc-stretch-mode')
      expect(stretchModeDiv.style.display).toBe('none')

      const batchRadio = document.querySelector('input[name="vc-stretch-mode"][value="batch"]')
      expect(batchRadio.checked).toBe(true)

      const batchGroup = document.getElementById('vc-stretch-batch')
      const perbandGroup = document.getElementById('vc-stretch-perband')
      expect(batchGroup.style.display).toBe('')
      expect(perbandGroup.style.display).toBe('none')
    })
  })
})
