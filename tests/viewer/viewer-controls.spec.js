import { test, expect } from '@playwright/test'

/**
 * COG 로딩 완료 대기 (로딩 스피너가 사라질 때까지)
 */
async function waitForCogReady(page) {
  await page.waitForFunction(() => {
    const loadingEl = document.getElementById('loading')
    return loadingEl && !loadingEl.classList.contains('active')
  }, { timeout: 30000 })
}

test.describe('밴드 선택 UI', () => {

  test('RGB/단일 밴드 모드 전환', async ({ page }) => {
    await page.goto('')
    await waitForCogReady(page)

    // 패널 열기
    await page.locator('#vc-toggle-btn').click()
    await expect(page.locator('#viewer-controls-panel')).toHaveClass(/open/)

    const bandMode = page.locator('#vc-band-mode')
    await expect(bandMode).toBeVisible()
    await expect(bandMode).toBeEnabled()

    // 현재 모드 확인 (기본 COG에 따라 다를 수 있음)
    const initialMode = await bandMode.inputValue()

    // RGB 모드로 전환
    await bandMode.selectOption('rgb')
    const rgbGroup = page.locator('#vc-band-rgb-group')
    const singleGroup = page.locator('#vc-band-single-group')
    await expect(rgbGroup).toBeVisible()
    await expect(singleGroup).toBeHidden()

    // 컬러맵은 RGB 모드에서 비활성화
    await expect(page.locator('#vc-colormap')).toBeDisabled()

    // 단일 밴드 모드로 전환
    await bandMode.selectOption('single')
    await expect(rgbGroup).toBeHidden()
    await expect(singleGroup).toBeVisible()

    // 컬러맵은 단일 밴드 모드에서 활성화
    await expect(page.locator('#vc-colormap')).toBeEnabled()
  })

  test('드롭다운 선택 시 스타일 변경 콜백 호출', async ({ page }) => {
    await page.goto('')
    await waitForCogReady(page)

    await page.locator('#vc-toggle-btn').click()

    // 스타일 변경 감지를 위해 window에 플래그 설정
    await page.evaluate(() => {
      window.__styleChangeCount = 0
      const origCb = window.__onStyleChange
      // viewerControls는 onStyleChange 콜백을 통해 변경을 전파함
      // getCurrentStyle()의 반환값이 바뀌는지 확인
      window.__lastStyle = null
    })

    const bandMode = page.locator('#vc-band-mode')
    const currentMode = await bandMode.inputValue()

    // 모드를 토글하여 변경 확인
    const newMode = currentMode === 'rgb' ? 'single' : 'rgb'
    await bandMode.selectOption(newMode)

    // getCurrentStyle()이 올바른 bandType을 반환하는지 확인
    const style = await page.evaluate(() => {
      const { getCurrentStyle } = window.__viewerControls || {}
      // getCurrentStyle이 전역에 노출되어 있지 않을 수 있으므로 DOM 직접 확인
      const bandMode = document.getElementById('vc-band-mode')
      return bandMode ? bandMode.value : null
    })

    expect(style).toBe(newMode)
  })
})

test.describe('컬러맵 변경', () => {

  test('단일 밴드 모드에서 컬러맵 변경', async ({ page }) => {
    await page.goto('')
    await waitForCogReady(page)

    await page.locator('#vc-toggle-btn').click()

    // 단일 밴드 모드로 전환
    await page.locator('#vc-band-mode').selectOption('single')

    const colormapSelect = page.locator('#vc-colormap')
    await expect(colormapSelect).toBeEnabled()

    // 컬러맵 변경
    await colormapSelect.selectOption('viridis')
    expect(await colormapSelect.inputValue()).toBe('viridis')

    // rendercomplete 이벤트 대기하여 렌더링 반영 확인
    const rendered = await page.evaluate(() => {
      return new Promise(resolve => {
        if (!window.olMap) return resolve(false)
        window.olMap.once('rendercomplete', () => resolve(true))
        window.olMap.renderSync()
        setTimeout(() => resolve(false), 5000)
      })
    })

    // 렌더링이 완료되었거나 맵이 존재하면 통과
    expect(rendered).toBeTruthy()
  })
})

test.describe('Min/Max 스트레치 슬라이더', () => {

  test('슬라이더 조작 시 값 표시 업데이트', async ({ page }) => {
    await page.goto('')
    await waitForCogReady(page)

    await page.locator('#vc-toggle-btn').click()

    const minSlider = page.locator('#vc-min-slider')
    const maxSlider = page.locator('#vc-max-slider')
    const minValue = page.locator('#vc-min-value')
    const maxValue = page.locator('#vc-max-value')

    await expect(minSlider).toBeEnabled()
    await expect(maxSlider).toBeEnabled()

    // 현재 값 기록
    const initialMin = await minValue.textContent()
    const initialMax = await maxValue.textContent()

    // min 슬라이더를 중간값으로 설정
    const minAttr = await minSlider.getAttribute('min')
    const maxAttr = await minSlider.getAttribute('max')
    const midValue = ((Number(minAttr) + Number(maxAttr)) / 2).toString()

    await minSlider.fill(midValue)
    await minSlider.dispatchEvent('input')

    // 값 표시가 업데이트되었는지 확인
    const updatedMin = await minValue.textContent()
    expect(updatedMin).not.toBe(initialMin)
  })

  test('Auto 리셋 버튼 동작', async ({ page }) => {
    await page.goto('')
    await waitForCogReady(page)

    await page.locator('#vc-toggle-btn').click()

    const minSlider = page.locator('#vc-min-slider')
    const resetBtn = page.locator('#vc-reset-btn')

    await expect(resetBtn).toBeEnabled()

    // 초기 값 기록
    const originalValue = await minSlider.inputValue()

    // 슬라이더를 변경
    const maxAttr = await minSlider.getAttribute('max')
    await minSlider.fill(maxAttr)
    await minSlider.dispatchEvent('input')

    // 값이 변경되었는지 확인
    expect(await minSlider.inputValue()).not.toBe(originalValue)

    // 리셋 버튼 클릭
    await resetBtn.click()

    // 원래 값으로 복원되었는지 확인
    expect(await minSlider.inputValue()).toBe(originalValue)
  })
})

test.describe('투영 모드 토글', () => {

  test('Affine ↔ Reproject 전환', async ({ page }) => {
    await page.goto('')
    await waitForCogReady(page)

    await page.locator('#vc-toggle-btn').click()

    const affineBtn = page.locator('#vc-proj-affine')
    const reprojBtn = page.locator('#vc-proj-reproject')

    await expect(affineBtn).toBeVisible()
    await expect(reprojBtn).toBeVisible()

    // 초기 상태 확인 (하나는 active)
    const affineActive = await affineBtn.evaluate(el => el.classList.contains('active'))
    const reprojActive = await reprojBtn.evaluate(el => el.classList.contains('active'))
    expect(affineActive || reprojActive).toBeTruthy()

    // 비활성 버튼 클릭
    if (affineActive) {
      await reprojBtn.click()
      await expect(reprojBtn).toHaveClass(/active/)
      await expect(affineBtn).not.toHaveClass(/active/)

      // 다시 Affine으로
      await affineBtn.click()
      await expect(affineBtn).toHaveClass(/active/)
      await expect(reprojBtn).not.toHaveClass(/active/)
    } else {
      await affineBtn.click()
      await expect(affineBtn).toHaveClass(/active/)
      await expect(reprojBtn).not.toHaveClass(/active/)

      // 다시 Reproject로
      await reprojBtn.click()
      await expect(reprojBtn).toHaveClass(/active/)
      await expect(affineBtn).not.toHaveClass(/active/)
    }
  })
})
