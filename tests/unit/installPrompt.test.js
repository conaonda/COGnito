/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

function setupDOM() {
  document.body.innerHTML = `<div id="app"></div>`
}

async function loadInstallPrompt() {
  vi.resetModules()
  return import('../../src/installPrompt.js')
}

describe('installPrompt.js', () => {
  beforeEach(() => {
    setupDOM()
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('beforeinstallprompt 이벤트 발생 시 배너가 생성됨', async () => {
    await loadInstallPrompt()

    const mockEvent = { preventDefault: vi.fn(), prompt: vi.fn(), userChoice: Promise.resolve() }
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), mockEvent))

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(document.getElementById('install-banner')).not.toBeNull()
  })

  it('dismiss 상태에서는 배너가 생성되지 않음', async () => {
    sessionStorage.setItem('cognito-install-dismissed', '1')
    await loadInstallPrompt()

    const mockEvent = { preventDefault: vi.fn(), prompt: vi.fn(), userChoice: Promise.resolve() }
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), mockEvent))

    expect(document.getElementById('install-banner')).toBeNull()
  })

  it('닫기 버튼 클릭 시 sessionStorage에 dismiss 저장', async () => {
    await loadInstallPrompt()

    const mockEvent = { preventDefault: vi.fn(), prompt: vi.fn(), userChoice: Promise.resolve() }
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), mockEvent))

    document.getElementById('install-dismiss').click()
    expect(sessionStorage.getItem('cognito-install-dismissed')).toBe('1')
  })

  it('네이티브 프롬프트 취소 시 sessionStorage에 dismiss 저장', async () => {
    await loadInstallPrompt()

    const mockEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    }
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), mockEvent))

    document.getElementById('install-btn').click()
    await mockEvent.userChoice
    expect(sessionStorage.getItem('cognito-install-dismissed')).toBe('1')
  })

  it('설치 버튼 클릭 시 prompt() 호출됨', async () => {
    await loadInstallPrompt()

    const mockEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    }
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), mockEvent))

    document.getElementById('install-btn').click()
    expect(mockEvent.prompt).toHaveBeenCalled()
  })
})
