import { test, expect } from '@playwright/test'

/**
 * COG 로딩 및 뷰어 컨트롤 초기화 완료 대기
 * window._viewerControlsReady 플래그를 사용하여 실제 앱 로직 완료 확인
 */
async function waitForCogReady(page) {
  await page.waitForFunction(() => window._viewerControlsReady === true, { timeout: 30000 })
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

  test('드롭다운 선택 시 앱 상태(bandInfo) 반영', async ({ page }) => {
    await page.goto('')
    await waitForCogReady(page)

    await page.locator('#vc-toggle-btn').click()

    const bandMode = page.locator('#vc-band-mode')
    const currentMode = await bandMode.inputValue()

    // 모드를 토글
    const newMode = currentMode === 'rgb' ? 'single' : 'rgb'
    await bandMode.selectOption(newMode)

    // bandType 매핑: UI 'rgb' → state 'rgb', UI 'single' → state 'gray'
    const expectedType = newMode === 'rgb' ? 'rgb' : 'gray'

    // 밴드 모드 변경이 앱 상태에 즉시 반영되는지 확인
    await page.waitForFunction(
      (expected) => window._currentViewerState?.bandInfo?.type === expected,
      expectedType,
      { timeout: 10000 }
    )
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

    // olMap이 초기화되어 있는지 확인 (앱 로딩이 완료되면 window.olMap이 설정됨)
    const hasMap = await page.evaluate(() => !!window.olMap)
    expect(hasMap).toBe(true)

    // rendercomplete 이벤트 대기하여 렌더링 반영 확인
    const rendered = await page.evaluate(() => {
      return new Promise(resolve => {
        window.olMap.once('rendercomplete', () => resolve(true))
        window.olMap.renderSync()
        setTimeout(() => resolve(false), 5000)
      })
    })
    expect(rendered).toBe(true)
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

test.describe('밴드 URL 파라미터 공유/복원', () => {

  test('공유 URL에 bands 파라미터가 포함됨', async ({ page }) => {
    await page.goto('')
    await waitForCogReady(page)

    // clipboardData를 캡처하기 위해 clipboard API를 모킹
    let copiedUrl = ''
    await page.evaluate(() => {
      navigator.clipboard.writeText = async (text) => { window._copiedUrl = text }
    })

    await page.locator('#cog-share-btn').click()

    copiedUrl = await page.evaluate(() => window._copiedUrl)
    const params = new URL(copiedUrl).searchParams
    expect(params.get('bands')).toBeTruthy()

    // bands 파라미터가 쉼표로 구분된 숫자 형식인지 확인
    const bands = params.get('bands').split(',').map(Number)
    expect(bands.length).toBeGreaterThan(0)
    expect(bands.every(b => Number.isInteger(b) && b >= 1)).toBe(true)
  })

  test('bands URL 파라미터로 밴드 설정 복원', async ({ page }) => {
    // bands=3,2,1로 접속 (역순 RGB)
    await page.goto('?bands=3,2,1')
    await waitForCogReady(page)

    // window._currentViewerState.bandInfo가 URL 파라미터를 반영하는지 확인
    const bandInfo = await page.evaluate(() => window._currentViewerState?.bandInfo)
    expect(bandInfo).toBeTruthy()
    expect(bandInfo.bands).toEqual([3, 2, 1])
    expect(bandInfo.type).toBe('rgb')
  })

  test('단일 밴드 bands 파라미터 복원', async ({ page }) => {
    // bands=2로 접속 (단일 밴드)
    await page.goto('?bands=2')
    await waitForCogReady(page)

    const bandInfo = await page.evaluate(() => window._currentViewerState?.bandInfo)
    expect(bandInfo).toBeTruthy()
    expect(bandInfo.bands).toEqual([2])
    expect(bandInfo.type).toBe('gray')
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
