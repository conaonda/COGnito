import { signIn, signOut, signInWithEmail, signUpWithEmail, getSession, onAuthStateChange } from './auth.js'
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
      closeLoginModal()
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

  const btn = document.createElement('button')
  btn.className = 'auth-login-btn'
  btn.textContent = '로그인'
  btn.addEventListener('click', () => openLoginModal())
  wrapper.appendChild(btn)

  container.appendChild(wrapper)
}

function openLoginModal() {
  if (document.getElementById('login-modal-overlay')) return

  const overlay = document.createElement('div')
  overlay.id = 'login-modal-overlay'
  overlay.className = 'login-modal-overlay'
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeLoginModal()
  })

  const modal = document.createElement('div')
  modal.className = 'login-modal'

  const closeBtn = document.createElement('button')
  closeBtn.className = 'login-modal-close'
  closeBtn.textContent = '✕'
  closeBtn.addEventListener('click', () => closeLoginModal())
  modal.appendChild(closeBtn)

  const title = document.createElement('h2')
  title.className = 'login-modal-title'
  title.textContent = 'COGnito'
  modal.appendChild(title)

  // Tabs
  const tabs = document.createElement('div')
  tabs.className = 'login-modal-tabs'
  const loginTab = document.createElement('button')
  loginTab.className = 'login-modal-tab active'
  loginTab.textContent = '로그인'
  const signupTab = document.createElement('button')
  signupTab.className = 'login-modal-tab'
  signupTab.textContent = '회원가입'
  tabs.appendChild(loginTab)
  tabs.appendChild(signupTab)
  modal.appendChild(tabs)

  // Form
  const form = document.createElement('form')
  form.className = 'login-modal-form'
  form.addEventListener('submit', (e) => e.preventDefault())

  const emailInput = document.createElement('input')
  emailInput.type = 'email'
  emailInput.placeholder = '이메일'
  emailInput.required = true
  emailInput.className = 'login-modal-input'

  const passwordInput = document.createElement('input')
  passwordInput.type = 'password'
  passwordInput.placeholder = '비밀번호'
  passwordInput.required = true
  passwordInput.className = 'login-modal-input'

  const errorMsg = document.createElement('p')
  errorMsg.className = 'login-modal-error'

  const submitBtn = document.createElement('button')
  submitBtn.type = 'submit'
  submitBtn.className = 'login-modal-submit'
  submitBtn.textContent = '로그인'

  form.appendChild(emailInput)
  form.appendChild(passwordInput)
  form.appendChild(errorMsg)
  form.appendChild(submitBtn)
  modal.appendChild(form)

  let isLogin = true

  loginTab.addEventListener('click', () => {
    isLogin = true
    loginTab.classList.add('active')
    signupTab.classList.remove('active')
    submitBtn.textContent = '로그인'
    errorMsg.textContent = ''
  })

  signupTab.addEventListener('click', () => {
    isLogin = false
    signupTab.classList.add('active')
    loginTab.classList.remove('active')
    submitBtn.textContent = '회원가입'
    errorMsg.textContent = ''
  })

  form.addEventListener('submit', async () => {
    const email = emailInput.value.trim()
    const password = passwordInput.value
    if (!email || !password) return

    errorMsg.textContent = ''
    submitBtn.disabled = true
    submitBtn.textContent = '처리 중...'

    if (isLogin) {
      const { error } = await signInWithEmail(email, password)
      if (error) {
        errorMsg.textContent = error.message
        submitBtn.disabled = false
        submitBtn.textContent = '로그인'
      }
    } else {
      const { error } = await signUpWithEmail(email, password)
      if (error) {
        errorMsg.textContent = error.message
        submitBtn.disabled = false
        submitBtn.textContent = '회원가입'
      } else {
        errorMsg.className = 'login-modal-error success'
        errorMsg.textContent = '인증 메일이 발송되었습니다. 이메일을 확인해주세요.'
        submitBtn.disabled = false
        submitBtn.textContent = '회원가입'
      }
    }
  })

  // Separator
  const separator = document.createElement('div')
  separator.className = 'login-modal-separator'
  separator.innerHTML = '<span>또는</span>'
  modal.appendChild(separator)

  // Google button
  const googleBtn = document.createElement('button')
  googleBtn.className = 'login-modal-google'
  googleBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> Google로 계속하기'
  googleBtn.addEventListener('click', () => signIn('google'))
  modal.appendChild(googleBtn)

  overlay.appendChild(modal)
  document.body.appendChild(overlay)
  emailInput.focus()
}

function closeLoginModal() {
  const overlay = document.getElementById('login-modal-overlay')
  if (overlay) overlay.remove()
}
