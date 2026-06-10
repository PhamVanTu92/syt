import { useAuthStore } from '@/store/auth.store'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v2'

function getToken(): string {
  return useAuthStore.getState().token ?? localStorage.getItem('auth_token') ?? ''
}

// Unwrap new backend format { success: true, data: ... }
function unwrap(data: any): any {
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    const unwrapped = data.data
    // Map accessToken → token for auth compatibility
    if (unwrapped && typeof unwrapped === 'object' && 'accessToken' in unwrapped && !('token' in unwrapped)) {
      return { ...unwrapped, token: unwrapped.accessToken }
    }
    return unwrapped
  }
  return data
}

const handleResponse = async (response: Response, _method: string) => {
  let data: any
  try { data = await response.json() } catch { data = {} }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('auth_token')
      window.dispatchEvent(new Event('auth-change'))
    }
    const errData = unwrap(data)
    throw new Error(errData?.message || data?.message || `API Error: ${response.status}`)
  }

  return unwrap(data)
}

export const api = {
  async get(endpoint: string, params?: Record<string, any>) {
    const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    let url = `${BASE_URL}${clean}`
    if (params) {
      const qs = new URLSearchParams()
      for (const k in params) {
        if (params[k] !== undefined && params[k] !== null) qs.append(k, String(params[k]))
      }
      const s = qs.toString()
      if (s) url += (url.includes('?') ? '&' : '?') + s
    }
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${getToken()}`, Accept: 'application/json' },
    })
    return handleResponse(res, 'GET')
  },

  async post(endpoint: string, data: any) {
    const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const res = await fetch(`${BASE_URL}${clean}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, Accept: 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    })
    return handleResponse(res, 'POST')
  },

  async put(endpoint: string, data: any) {
    const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const res = await fetch(`${BASE_URL}${clean}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, Accept: 'application/json' },
      body: JSON.stringify(data),
    })
    return handleResponse(res, 'PUT')
  },

  async patch(endpoint: string, data: any) {
    const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const res = await fetch(`${BASE_URL}${clean}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, Accept: 'application/json' },
      body: JSON.stringify(data),
    })
    return handleResponse(res, 'PATCH')
  },

  async delete(endpoint: string) {
    const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const res = await fetch(`${BASE_URL}${clean}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}`, Accept: 'application/json' },
    })
    return handleResponse(res, 'DELETE')
  },

  async upload(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    })
    return handleResponse(res, 'POST')
  },

  async getUsers() { return this.get('/users') },
  async getUser(id: number | string) { return this.get(`/users/${id}`) },
  async getPermissions(params?: any) { return this.get('/permissions', params) },
  async createPermission(data: any) { return this.post('/permissions', data) },
  async updatePermission(id: number | string, data: any) { return this.put(`/permissions/${id}`, data) },
  async deletePermission(id: number | string) { return this.delete(`/permissions/${id}`) },
  async updateUser(id: number | string, data: any) { return this.put(`/users/${id}`, data) },
  async createUser(data: any) { return this.post('/users', data) },
  async register(data: any) { return this.post('/auth/register', data) },
  async getSmtpConfig() { return this.get('/email-confirm') },
  async updateSmtpConfig(data: any) { return this.put('/email-confirm', data) },
  async confirmPassword(data: { email: string; password: string; token: string }) { return this.post('/auth/confirm-password', data) },
  async checkToken(token: string) { return this.get(`/auth/check-token/${token}`) },
  async forgotPassword(email: string) { return this.post('/auth/forgot-password', { email }) },
  async resendVerification(email: string) { return this.post('/auth/resend-verification', { email }) },
  async requestVerificationEmail(email: string) { return this.post('/auth/resend-verification', { email }) },
  async changePassword(data: any) { return this.put('/auth/change-password', data) },
  async getMe() { return this.get('/auth/me') },
  async getRoles(params?: any) { return this.get('/roles', params) },
  async getRole(id: number | string) { return this.get(`/roles/${id}`) },
  async createRole(data: any) { return this.post('/roles', data) },
  async updateRole(id: number | string, data: any) { return this.put(`/roles/${id}`, data) },
  async deleteRole(id: number | string) { return this.delete(`/roles/${id}`) },
  async assignPermissionsToRole(roleId: number | string, permissionIds: (number | string)[]) { return this.put(`/roles/${roleId}/permissions`, { permission_ids: permissionIds }) },
  async assignRoleToUser(data: { user_id: number | string; role_ids: (number | string)[] }) { return this.put('/roles/assign-user', data) },
  async getUserEffectivePermissions(userId: number | string) { return this.get(`/roles/user/${userId}/permissions`) },
  async getBanners(params?: any) { return this.get('/banners', params) },
  async getBanner(id: number | string) { return this.get(`/banners/${id}`) },
  async createBanner(payload: FormData | Record<string, any>) {
    const isFormData = payload instanceof FormData
    const headers: Record<string, string> = { Authorization: `Bearer ${getToken()}`, Accept: 'application/json' }
    if (!isFormData) headers['Content-Type'] = 'application/json'
    const res = await fetch(`${BASE_URL}/banners`, {
      method: 'POST', headers,
      body: isFormData ? (payload as FormData) : JSON.stringify(payload),
    })
    return handleResponse(res, 'POST')
  },
  async updateBanner(id: number | string, payload: FormData | Record<string, any>) {
    const isFormData = payload instanceof FormData
    const headers: Record<string, string> = { Authorization: `Bearer ${getToken()}`, Accept: 'application/json' }
    if (!isFormData) headers['Content-Type'] = 'application/json'
    const res = await fetch(`${BASE_URL}/banners/${id}`, {
      method: 'PUT', headers,
      body: isFormData ? (payload as FormData) : JSON.stringify(payload),
    })
    return handleResponse(res, 'PUT')
  },
  async deleteBanner(id: number | string) { return this.delete(`/banners/${id}`) },
  async reorderBanners(items: { id: number | string; sort_order: number }[]) { return this.patch('/banners/reorder', items) },
  async getGsatReport(params?: any) { return this.get('/reports/gsat', params) },
  async getEvaluateDashboard(survey_key?: string) {
    const params: any = {}
    if (survey_key) params.survey_key = survey_key
    return this.get('/feedbacks/evaluate-dashboard', params)
  },
}
