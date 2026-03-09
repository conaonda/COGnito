import { test, expect } from '@playwright/test'

/**
 * Supabase API를 모킹 — auth(세션 없음) + REST(빈 응답)
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
 * 앱 초기화 완료 대기 (COG 로딩 후 initCatalogUI가 호출됨)
 */
async function waitForAppInit(page) {
  await page.waitForFunction(() => {
    const loadingEl = document.getElementById('loading')
    return loadingEl && !loadingEl.classList.contains('active')
  }, { timeout: 30000 })
}

test.describe('카탈로그 UI 스모크 테스트', () => {

  test('카탈로그 패널: 토글 버튼 존재 + 패널 열기/닫기', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('')
    await waitForAppInit(page)

    const toggleBtn = page.locator('#catalog-toggle-btn')
    await expect(toggleBtn).toBeVisible()

    // 패널은 처음에 닫혀 있음
    const panel = page.locator('#catalog-panel')
    await expect(panel).not.toHaveClass(/open/)

    // 클릭으로 열기
    await toggleBtn.click()
    await expect(panel).toHaveClass(/open/)

    // 닫기 버튼
    await page.locator('#catalog-panel-close').click()
    await expect(panel).not.toHaveClass(/open/)
  })

  test('카탈로그 패널: 정렬 드롭다운 존재', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('')
    await waitForAppInit(page)

    await page.locator('#catalog-toggle-btn').click()

    // 정렬 드롭다운이 DOM에 동적 삽입됨
    const sortSelect = page.locator('#catalog-sort-select')
    await expect(sortSelect).toBeVisible()

    // 옵션 확인
    const options = sortSelect.locator('option')
    await expect(options).toHaveCount(5)
  })

  test('관심목록 패널: 비로그인 시 토글 버튼 숨김', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('')
    await waitForAppInit(page)

    // 비로그인 상태에서는 관심목록 버튼이 display:none
    const watchlistBtn = page.locator('#watchlist-toggle-btn')
    await expect(watchlistBtn).toBeHidden()
  })

  test('관심목록 패널: HTML 구조 존재', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('')
    await waitForAppInit(page)

    // 패널 자체는 DOM에 존재
    const panel = page.locator('#watchlist-panel')
    await expect(panel).toBeAttached()

    // 내부 구조 확인
    await expect(page.locator('#watchlist-create-btn')).toBeAttached()
    await expect(page.locator('#watchlist-list')).toBeAttached()
  })
})
