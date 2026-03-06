const banner = document.getElementById('offline-banner')

let offline = !navigator.onLine

function setOffline(value) {
  offline = value
  banner.classList.toggle('active', offline)
  updateNetworkDependentUI()
  document.dispatchEvent(new CustomEvent('offline-status-changed', { detail: { offline } }))
}

function updateNetworkDependentUI() {
  const elements = document.querySelectorAll('[data-requires-network]')
  elements.forEach(el => {
    if (offline) {
      el.dataset.offlineDisabled = el.disabled ? 'was-disabled' : 'was-enabled'
      el.disabled = true
      el.title = '오프라인 상태에서는 사용할 수 없습니다'
    } else {
      if (el.dataset.offlineDisabled === 'was-enabled') {
        el.disabled = false
      }
      delete el.dataset.offlineDisabled
      el.title = ''
    }
  })
}

window.addEventListener('offline', () => setOffline(true))
window.addEventListener('online', () => setOffline(false))

// 초기 상태 반영
if (offline) setOffline(true)

export function isOffline() {
  return offline
}
