let deferredPrompt = null

const DISMISS_KEY = 'cognito-install-dismissed'

function createBanner() {
  const banner = document.createElement('div')
  banner.id = 'install-banner'
  banner.className = 'install-banner'
  banner.innerHTML = `
    <span>COGnito를 설치하면 더 빠르게 접근할 수 있습니다.</span>
    <button id="install-btn" class="install-btn">설치</button>
    <button id="install-dismiss" class="install-dismiss" aria-label="닫기">&times;</button>
  `
  document.getElementById('app').appendChild(banner)
  return banner
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e

  if (sessionStorage.getItem(DISMISS_KEY)) return

  const banner = createBanner()
  requestAnimationFrame(() => banner.classList.add('active'))

  document.getElementById('install-btn').addEventListener('click', async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
    banner.classList.remove('active')
  })

  document.getElementById('install-dismiss').addEventListener('click', () => {
    banner.classList.remove('active')
    sessionStorage.setItem(DISMISS_KEY, '1')
  })
})
