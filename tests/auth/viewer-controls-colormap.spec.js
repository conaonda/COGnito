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
  // Capture console errors for debugging
  const errors = []
  page.on('console', msg => {
    if (msg.type() === 'warning' || msg.type() === 'error') {
      errors.push(`[${msg.type()}] ${msg.text()}`)
    }
  })

  await page.waitForFunction(() => {
    return window.currentCogMeta && window.currentTiff
  }, { timeout: 90000 })

  // Wait for viewer controls ready or error
  await page.waitForFunction(() => {
    return window._viewerControlsReady || window._viewerControlsError
  }, { timeout: 30000 })

  // Check if controls initialization failed
  const ctrlError = await page.evaluate(() => window._viewerControlsError)
  if (ctrlError) {
    throw new Error(`뷰어 컨트롤 갱신 실패: ${ctrlError}\nConsole: ${errors.join('\n')}`)
  }
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
    await page.waitForTimeout(3000)

    const analysis = await page.evaluate(() => {
      const canvases = document.querySelectorAll('#map canvas')
      for (const canvas of canvases) {
        const ctx = canvas.getContext('2d')
        if (!ctx) continue
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const px = imgData.data
        let totalVisible = 0
        let nonGray = 0
        // viridis 색상 계열 카운트 (보라~청록~녹~황)
        let purple = 0, teal = 0, green = 0, yellow = 0
        const sampleColors = []
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] === 0) continue
          totalVisible++
          const r = px[i], g = px[i + 1], b = px[i + 2]
          if (r !== g || g !== b) nonGray++
          // 색상 분류
          if (b > r && b > g) purple++
          else if (g > r && g > b && b > 80) teal++
          else if (g > r && g > b) green++
          else if (r > 200 && g > 200 && b < 100) yellow++
          // 처음 10개 비그레이스케일 픽셀 샘플
          if (sampleColors.length < 10 && (r !== g || g !== b)) {
            sampleColors.push([r, g, b])
          }
        }
        if (totalVisible > 0) {
          return {
            canvasSize: `${canvas.width}x${canvas.height}`,
            totalVisible, nonGray,
            nonGrayRatio: (nonGray / totalVisible * 100).toFixed(1),
            purple, teal, green, yellow,
            sampleColors,
            pipeline: window._currentImageResult ? 'canvas' : 'webgl'
          }
        }
      }
      return null
    })

    console.log('Viridis pixel analysis:', JSON.stringify(analysis, null, 2))

    expect(analysis).not.toBeNull()
    // 최소 10% 이상의 가시 픽셀이 비-그레이스케일이어야 함
    expect(Number(analysis.nonGrayRatio)).toBeGreaterThan(10)
    // viridis 스펙트럼: 최소 2개 색상 계열이 존재해야 함
    const colorCategories = [analysis.purple, analysis.teal, analysis.green, analysis.yellow]
      .filter(c => c > 0).length
    expect(colorCategories).toBeGreaterThanOrEqual(2)
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
