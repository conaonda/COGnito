import { signIn, signOut, getSession, onAuthStateChange } from './auth.js'
import { supabase } from './supabase.js'

/**
 * 헤더에 인증 UI를 초기화한다.
 * Supabase 미설정 시 아무것도 렌더링하지 않는다.
 */
export function initAuthUI() {
  if (!supabase) return

  const headerTop = document.querySelector('.header-top')
  if (!headerTop) return

  const authContainer = document.createElement('div')
  authContainer.className = 'auth-container'

  headerTop.appendChild(authContainer)

  renderLoggedOut(authContainer)

  getSession().then(session => {
    if (session?.user) {
      renderLoggedIn(authContainer, session.user)
    }
  })

  onAuthStateChange((_event, session) => {
    if (session?.user) {
      renderLoggedIn(authContainer, session.user)
    } else {
      renderLoggedOut(authContainer)
    }
  })
}

function renderLoggedIn(container, user) {
  const avatarUrl = user.user_metadata?.avatar_url || ''
  const displayName = user.user_metadata?.full_name
    || user.user_metadata?.user_name
    || user.email?.split('@')[0]
    || 'User'

  container.innerHTML = ''

  const wrapper = document.createElement('div')
  wrapper.className = 'auth-user'

  if (avatarUrl) {
    const img = document.createElement('img')
    img.src = avatarUrl
    img.alt = ''
    img.className = 'auth-avatar'
    wrapper.appendChild(img)
  }

  const nameSpan = document.createElement('span')
  nameSpan.className = 'auth-name'
  nameSpan.textContent = displayName
  wrapper.appendChild(nameSpan)

  const logoutBtn = document.createElement('button')
  logoutBtn.className = 'auth-logout-btn'
  logoutBtn.title = '로그아웃'
  logoutBtn.textContent = '로그아웃'
  logoutBtn.addEventListener('click', () => signOut())
  wrapper.appendChild(logoutBtn)

  container.appendChild(wrapper)
}

function renderLoggedOut(container) {
  container.innerHTML = ''

  const wrapper = document.createElement('div')
  wrapper.className = 'auth-login'

  const providers = [
    {
      name: 'google',
      title: 'Google로 로그인',
      svg: '<svg width="16" height="16" viewBox="0 0 48 48"><path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>'
    }
  ]

  providers.forEach(({ name, title, svg }) => {
    const btn = document.createElement('button')
    btn.className = 'auth-login-btn'
    btn.title = title
    btn.innerHTML = svg
    btn.addEventListener('click', () => signIn(name))
    wrapper.appendChild(btn)
  })

  container.appendChild(wrapper)
}
