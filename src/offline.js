const banner = document.getElementById('offline-banner')

function setOffline(offline) {
  banner.classList.toggle('active', offline)
}

window.addEventListener('offline', () => setOffline(true))
window.addEventListener('online', () => setOffline(false))

// 초기 상태 반영
if (!navigator.onLine) setOffline(true)
