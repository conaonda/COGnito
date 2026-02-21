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

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    full_name: 'Test User',
    user_name: 'testuser'
  }
}

const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  user: mockUser
}

test.describe('인증 UI 검증', () => {

  test('로그아웃 상태: 로그인 버튼 표시', async ({ page }) => {
    await mockSupabaseAuth(page, { session: null })

    await page.goto('')
    await page.waitForLoadState('domcontentloaded')

    // Supabase가 설정되어 있으므로 auth-container가 생성되어야 함
    const authContainer = page.locator('.auth-container')
    await expect(authContainer).toBeVisible()

    // GitHub + Google 로그인 버튼 2개
    const loginBtns = page.locator('.auth-login-btn')
    await expect(loginBtns).toHaveCount(2)

    // 각 버튼의 title 확인
    await expect(loginBtns.nth(0)).toHaveAttribute('title', 'GitHub으로 로그인')
    await expect(loginBtns.nth(1)).toHaveAttribute('title', 'Google로 로그인')
  })

  test('로그인 상태: 사용자 정보 표시', async ({ page }) => {
    await mockSupabaseAuth(page, { session: mockSession })

    // Supabase 클라이언트의 getSession이 mock session을 반환하도록
    // GoTrueClient가 초기화 시 /token 엔드포인트를 호출하므로
    // route mock에서 session을 반환하면 onAuthStateChange가 트리거됨

    await page.goto('')
    await page.waitForLoadState('domcontentloaded')

    // auth-user가 렌더링될 때까지 대기 (세션 확인 후 UI 업데이트)
    const authUser = page.locator('.auth-user')
    await expect(authUser).toBeVisible({ timeout: 10000 })

    // 아바타 이미지 확인
    const avatar = page.locator('.auth-avatar')
    await expect(avatar).toBeVisible()

    // 사용자 이름 확인
    const name = page.locator('.auth-name')
    await expect(name).toBeVisible()

    // 로그아웃 버튼 존재
    const logoutBtn = page.locator('.auth-logout-btn')
    await expect(logoutBtn).toBeVisible()
    await expect(logoutBtn).toHaveText('로그아웃')
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
