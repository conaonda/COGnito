/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

function setupDOM() {
  document.body.innerHTML = `<div id="offline-banner"></div>`
}

async function loadOffline() {
  vi.resetModules()
  return import('../../src/offline.js')
}

describe('offline.js', () => {
  beforeEach(() => {
    setupDOM()
    // 기본값: 온라인
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true })
  })

  it('초기 온라인 상태에서 배너에 active 클래스 없음', async () => {
    await loadOffline()
    const banner = document.getElementById('offline-banner')
    expect(banner.classList.contains('active')).toBe(false)
  })

  it('초기 오프라인 상태에서 배너에 active 클래스 추가', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true })
    await loadOffline()
    const banner = document.getElementById('offline-banner')
    expect(banner.classList.contains('active')).toBe(true)
  })

  it('offline 이벤트 발생 시 배너에 active 클래스 추가', async () => {
    await loadOffline()
    window.dispatchEvent(new Event('offline'))
    const banner = document.getElementById('offline-banner')
    expect(banner.classList.contains('active')).toBe(true)
  })

  it('online 이벤트 발생 시 배너에서 active 클래스 제거', async () => {
    await loadOffline()
    window.dispatchEvent(new Event('offline'))
    window.dispatchEvent(new Event('online'))
    const banner = document.getElementById('offline-banner')
    expect(banner.classList.contains('active')).toBe(false)
  })
})
