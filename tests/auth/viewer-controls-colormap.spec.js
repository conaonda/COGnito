import { test, expect } from '@playwright/test'

const CAPELLA_URL = 'https://capella-open-data.s3.amazonaws.com/data/2025/12/5/CAPELLA_C17_SS_GEO_HH_20251205200331_20251205200347/CAPELLA_C17_SS_GEO_HH_20251205200331_20251205200347_preview.tif'

/**
 * Supabase API 모킹 — auth(세션 없음) + REST(빈 응답)
 */
function mockSupabase(page) {
  return page.route('**/rest/v1/**', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    })
  }).then(() => page.route('**/auth/v1/**', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { session: null }, error: null })
    })
  }))
}

/**
 * 앱 초기화 + COG 로드 완료 대기
 */
async function waitForCogLoad(page) {
  await page.waitForFunction(() => {
    return window.currentCogMeta && window.currentTiff
  }, { timeout: 60000 })
  // updateControlsForCog is async (getTotalBands + getMinMaxFromOverview)
  // Wait until viewer controls are actually enabled
  await page.waitForFunction(() => {
    const sel = document.getElementById('vc-band-mode')
    return sel && !sel.disabled
  }, { timeout: 30000 })
}

test.describe('뷰어 컨트롤: 컬러맵 검증 (Capella SAR)', () => {
  // 외부 COG 로드가 느릴 수 있으므로 타임아웃 확장
  test.setTimeout(120_000)

  test('단일 밴드 COG → 컬러맵 드롭다운 활성화 + Viridis 적용', async ({ page }) => {
    await mockSupabase(page)
    await page.goto(`?url=${encodeURIComponent(CAPELLA_URL)}`)
    await waitForCogLoad(page)

    // 컨트롤 패널 열기
    const toggleBtn = page.locator('#vc-toggle-btn')
    await expect(toggleBtn).toBeVisible()
    await toggleBtn.click()

    const panel = page.locator('#viewer-controls-panel')
    await expect(panel).toHaveClass(/open/)

    // 단일 밴드이므로 밴드 모드가 "single"이어야 함
    const bandMode = page.locator('#vc-band-mode')
    await expect(bandMode).toHaveValue('single')

    // 컬러맵 드롭다운이 활성화되어야 함
    const colormapSelect = page.locator('#vc-colormap')
    await expect(colormapSelect).toBeEnabled()

    // Viridis 선택
    await colormapSelect.selectOption('viridis')
    await expect(colormapSelect).toHaveValue('viridis')

    // canvas에 실제로 컬러맵이 적용되었는지 확인 (pixel sampling)
    // WebGL 파이프라인: canvas 픽셀에 viridis 색상이 존재해야 함
    await page.waitForTimeout(2000)

    const hasColor = await page.evaluate(() => {
      const canvas = document.querySelector('#map canvas')
      if (!canvas) return false
      const ctx = canvas.getContext('2d')
      if (!ctx) return false
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const px = imgData.data
      // 비-그레이스케일 픽셀이 존재하는지 확인 (R !== G || G !== B)
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] > 0 && (px[i] !== px[i + 1] || px[i + 1] !== px[i + 2])) {
          return true
        }
      }
      return false
    })

    expect(hasColor).toBe(true)
  })

  test('Min/Max 슬라이더 존재 + 통계값 반영', async ({ page }) => {
    await mockSupabase(page)
    await page.goto(`?url=${encodeURIComponent(CAPELLA_URL)}`)
    await waitForCogLoad(page)

    await page.locator('#vc-toggle-btn').click()

    const minSlider = page.locator('#vc-min-slider')
    const maxSlider = page.locator('#vc-max-slider')

    await expect(minSlider).toBeVisible()
    await expect(maxSlider).toBeVisible()

    // 슬라이더의 min/max 속성이 0/1이 아닌 실제 통계값으로 설정되어야 함
    const minAttr = await minSlider.getAttribute('min')
    const maxAttr = await maxSlider.getAttribute('max')
    expect(Number(minAttr)).not.toBe(0)
    expect(Number(maxAttr)).not.toBe(1)
  })

  test('투영 모드 토글 버튼 존재 + 활성 상태', async ({ page }) => {
    await mockSupabase(page)
    await page.goto(`?url=${encodeURIComponent(CAPELLA_URL)}`)
    await waitForCogLoad(page)

    await page.locator('#vc-toggle-btn').click()

    const affineBtn = page.locator('#vc-proj-affine')
    const reprojBtn = page.locator('#vc-proj-reproject')

    await expect(affineBtn).toBeVisible()
    await expect(reprojBtn).toBeVisible()

    // 기본 모드는 affine
    await expect(affineBtn).toHaveClass(/active/)
  })
})
