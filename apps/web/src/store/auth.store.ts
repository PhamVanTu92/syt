import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { flattenPermissions, hasPermission } from '@soyte/shared-utils'
import type { UserWithPermissions } from '@soyte/shared-types'

interface AuthState {
  user: UserWithPermissions | null
  // SECURITY FIX: token NOT persisted to localStorage (XSS risk).
  // Kept in memory only — survives page navigation but cleared on tab close.
  // Backend issues short-lived 15min access tokens + httpOnly refresh cookie.
  token: string | null
  permissions: string[]
  isAuthenticated: boolean
  setAuth: (user: UserWithPermissions, token: string) => void
  clearAuth: () => void
  hasPermission: (key: string) => boolean
  isSuperAdmin: () => boolean
}

// In-memory token store — NOT in localStorage (XSS safe)
let _memoryToken: string | null = null

export const getMemoryToken = () => _memoryToken

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      permissions: [],
      isAuthenticated: false,

      setAuth: (user, token) => {
        const permissions = flattenPermissions(user.permissions)
        // CRITICAL FIX: store token in memory only, not localStorage
        _memoryToken = token
        set({ user, token, permissions, isAuthenticated: true })
      },

      clearAuth: () => {
        _memoryToken = null
        set({ user: null, token: null, permissions: [], isAuthenticated: false })
      },

      hasPermission: (key: string) => {
        const state = get()
        if (state.isSuperAdmin()) return true
        return hasPermission(state.permissions, key)
      },

      isSuperAdmin: () => {
        const { user, permissions } = get()
        return (
          user?.role === 'admin' &&
          permissions.length === 0 &&
          (!user.roles || user.roles.length === 0)
        )
      },
    }),
    {
      name: 'auth-storage',
      // Persist only user info + permissions (not the token)
      partialize: (s) => ({ user: s.user, permissions: s.permissions, isAuthenticated: s.isAuthenticated }),
      // On rehydration: token is null (memory cleared on refresh) → silent refresh via cookie
      onRehydrateStorage: () => (state) => {
        if (state) {
          _memoryToken = null
          state.token = null
          // isAuthenticated stays true → app will attempt silent refresh on first 401
        }
      },
    },
  ),
)

// Listen for logout events dispatched by api.ts interceptor
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    useAuthStore.getState().clearAuth()
  })
}
