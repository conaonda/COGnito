import { test, expect } from '@playwright/test'

/**
 * Supabase auth API를 모킹한다.
 * fake env vars로 빌드된 앱이 실제 API 대신 모킹된 응답을 받도록 한다.
 */
function mockSupabaseAuth(page, { session = null } = {}) {
  return page.route('**/auth/v1/**', async (route) => {
    const url = route.request().url()

    // getSession / token refresh
    if (url.includes('/token') || url.includes('/session')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { session },
          error: null
        })
      })
    }

    // signOut
    if (url.includes('/logout')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      })
    }

    // 기타 요청은 빈 응답
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: null, error: null })
    })
  })
}

test.describe('인증 UI 검증', () => {

  test('로그아웃 상태: 로그인 버튼 표시', async ({ page }) => {
    await mockSupabaseAuth(page, { session: null })

    await page.goto('')
    await page.waitForLoadState('domcontentloaded')

    // Supabase가 설정되어 있으므로 auth-container가 생성되어야 함
    const authContainer = page.locator('.auth-container')
    await expect(authContainer).toBeVisible()

    // 로그인 버튼 1개
    const loginBtn = page.locator('.auth-login-btn')
    await expect(loginBtn).toHaveCount(1)
    await expect(loginBtn).toHaveText('로그인')
  })

  test('인증 UI가 뷰어 기능을 방해하지 않음', async ({ page }) => {
    await mockSupabaseAuth(page, { session: null })

    await page.goto('')

    // COG 영상 로딩 완료 대기
    await page.waitForFunction(() => {
      const loadingEl = document.getElementById('loading')
      return loadingEl && !loadingEl.classList.contains('active')
    }, { timeout: 30000 })

    // 지도가 초기화되었는지 확인
    const mapExists = await page.evaluate(() => !!window.olMap)
    expect(mapExists).toBe(true)

    // 에러가 표시되지 않는지 확인
    const errorEl = page.locator('#error')
    await expect(errorEl).not.toHaveClass(/active/)
  })
})
