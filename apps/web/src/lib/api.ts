import axios from 'axios'
import { getMemoryToken } from '@/store/auth.store'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v2'

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send httpOnly refresh cookie
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token from MEMORY (not localStorage — XSS safe)
api.interceptors.request.use((config) => {
  const token = getMemoryToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

// Auto refresh on 401
api.interceptors.response.use(
  (res) => res.data,
  async (error: unknown) => {
    // CRITICAL FIX: safe type narrowing instead of unsafe cast
    if (!error || typeof error !== 'object') return Promise.reject(String(error))

    const axiosError = error as {
      config?: { _retry?: boolean; headers: Record<string, string> }
      response?: { status: number; data?: { message?: string } }
      message?: string
    }

    const original = axiosError.config

    if (axiosError.response?.status === 401 && original && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original as Parameters<typeof api>[0]))
          })
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post<{ data: { accessToken: string } }>(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        )
        const newToken = data.data.accessToken
        // Update memory token (no localStorage)
        const { useAuthStore } = await import('@/store/auth.store')
        const store = useAuthStore.getState()
        if (store.user) store.setAuth(store.user, newToken)
        refreshQueue.forEach((cb) => cb(newToken))
        refreshQueue = []
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original as Parameters<typeof api>[0])
      } catch {
        // PERF FIX: clear queue to prevent memory leak before redirecting
        refreshQueue = []
        localStorage.removeItem('access_token')
        localStorage.removeItem('auth-storage')
        window.dispatchEvent(new CustomEvent('auth:logout'))
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(
      axiosError.response?.data?.message ?? axiosError.message ?? 'Lỗi không xác định',
    )
  },
)

export default api
