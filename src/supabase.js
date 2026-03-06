import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Supabase 호스트에 대한 preconnect 힌트 동적 추가
if (supabaseUrl) {
  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = supabaseUrl
  document.head.appendChild(link)
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        lock: async (_name, _acquireTimeout, fn) => fn()
      }
    })
  : null
