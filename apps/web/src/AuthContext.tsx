import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/legacy-api'

interface User {
  id: string | number
  name?: string
  email: string
  full_name?: string
  fullName?: string
  role: string
  permissions: string[]
  unit?: string
  [key: string]: any
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (token: string, loginUser?: any) => Promise<any>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const store = useAuthStore()
  const [loading, setLoading] = useState(!store.user)

  // Sync localStorage token to store on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token && !store.token) {
      api.getMe().then((userData: any) => {
        const user = userData?.user ?? userData
        if (user) {
          store.setAuth(user, token)
          localStorage.setItem('user_info', JSON.stringify(user))
        }
      }).catch(() => {
        localStorage.removeItem('auth_token')
      }).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (token: string, loginUser?: any) => {
    localStorage.setItem('auth_token', token)
    const user = loginUser ?? await api.getMe().then((r: any) => r?.user ?? r)
    store.setAuth(user, token)
    localStorage.setItem('user_info', JSON.stringify(user))
    return user
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_info')
    store.clearAuth()
    window.location.href = '/login'
  }

  const user = store.user as User | null

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
