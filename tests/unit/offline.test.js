/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

let listeners = []
const origAddEventListener = window.addEventListener.bind(window)
const origRemoveEventListener = window.removeEventListener.bind(window)

function setupDOM() {
  document.body.innerHTML = `
    <div id="offline-banner"></div>
    <button id="btn1" data-requires-network>Load</button>
    <button id="btn2" data-requires-network>Search</button>
    <button id="btn3">Normal</button>
  `
}

async function loadOffline() {
  vi.resetModules()
  return import('../../src/offline.js')
}

describe('offline.js', () => {
  beforeEach(() => {
    setupDOM()
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true })
    // window 이벤트 리스너 추적
    listeners = []
    window.addEventListener = (type, handler, opts) => {
      listeners.push({ type, handler, opts })
      origAddEventListener(type, handler, opts)
    }
  })

  afterEach(() => {
    // 추적된 리스너 정리
    listeners.forEach(({ type, handler, opts }) => {
      origRemoveEventListener(type, handler, opts)
    })
    listeners = []
    window.addEventListener = origAddEventListener
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

  it('isOffline()이 현재 상태를 반환', async () => {
    const { isOffline } = await loadOffline()
    expect(isOffline()).toBe(false)
    window.dispatchEvent(new Event('offline'))
    expect(isOffline()).toBe(true)
    window.dispatchEvent(new Event('online'))
    expect(isOffline()).toBe(false)
  })

  it('오프라인 시 data-requires-network 버튼이 비활성화됨', async () => {
    await loadOffline()
    const btn1 = document.getElementById('btn1')
    const btn2 = document.getElementById('btn2')
    const btn3 = document.getElementById('btn3')

    expect(btn1.disabled).toBe(false)
    expect(btn2.disabled).toBe(false)

    window.dispatchEvent(new Event('offline'))
    expect(btn1.disabled).toBe(true)
    expect(btn2.disabled).toBe(true)
    expect(btn3.disabled).toBe(false)
    expect(btn1.title).toBe('오프라인 상태에서는 사용할 수 없습니다')
  })

  it('온라인 복귀 시 버튼이 다시 활성화됨', async () => {
    await loadOffline()
    window.dispatchEvent(new Event('offline'))
    window.dispatchEvent(new Event('online'))

    const btn1 = document.getElementById('btn1')
    expect(btn1.disabled).toBe(false)
    expect(btn1.title).toBe('')
  })

  it('원래 disabled 상태였던 버튼은 온라인 복귀 후에도 disabled 유지', async () => {
    await loadOffline()
    const btn1 = document.getElementById('btn1')
    btn1.disabled = true

    window.dispatchEvent(new Event('offline'))
    expect(btn1.disabled).toBe(true)

    window.dispatchEvent(new Event('online'))
    expect(btn1.disabled).toBe(true)
  })

  it('offline-status-changed 커스텀 이벤트가 발생함', async () => {
    await loadOffline()
    const events = []
    document.addEventListener('offline-status-changed', (e) => events.push(e.detail))

    window.dispatchEvent(new Event('offline'))
    window.dispatchEvent(new Event('online'))

    expect(events).toEqual([{ offline: true }, { offline: false }])
  })
})
