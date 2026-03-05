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
})
