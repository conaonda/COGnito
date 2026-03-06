import { test, expect } from '@playwright/test'

test.describe('오프라인 상태 감지 및 폴백 UI', () => {

  test('오프라인 전환 시 배너 표시 및 서버 의존 버튼 비활성화', async ({ page, context }) => {
    await page.goto('')
    // 초기: 온라인 상태, 배너 숨김
    const banner = page.locator('#offline-banner')
    await expect(banner).not.toHaveClass(/active/)

    const loadBtn = page.locator('#cog-url-load')
    const stacSearchBtn = page.locator('#stac-search-btn')
    await expect(loadBtn).toBeEnabled()

    // 오프라인 전환
    await context.setOffline(true)

    await expect(banner).toHaveClass(/active/)
    await expect(loadBtn).toBeDisabled()
    await expect(stacSearchBtn).toBeDisabled()
  })

  test('온라인 복귀 시 배너 해제 및 버튼 재활성화', async ({ page, context }) => {
    await page.goto('')

    // 오프라인 전환
    await context.setOffline(true)
    const banner = page.locator('#offline-banner')
    await expect(banner).toHaveClass(/active/)

    // 온라인 복귀
    await context.setOffline(false)
    await expect(banner).not.toHaveClass(/active/)
    await expect(page.locator('#cog-url-load')).toBeEnabled()
    await expect(page.locator('#stac-search-btn')).toBeEnabled()
  })

  test('오프라인 상태에서 비활성화된 버튼에 안내 tooltip 표시', async ({ page, context }) => {
    await page.goto('')
    await context.setOffline(true)

    const loadBtn = page.locator('#cog-url-load')
    await expect(loadBtn).toHaveAttribute('title', '오프라인 상태에서는 사용할 수 없습니다')
  })
})
