import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserStatus = 'active' | 'inactive' | 'suspended'
export type UserRole = 'admin' | 'manager' | 'editor' | 'viewer' | string

export interface User {
  id: string
  fullName: string
  email: string
  role: UserRole
  status: UserStatus
  unit: string | null
  avatar: string | null
  roles: Array<{ id: string; name: string; code: string }>
  permissions: Array<{ id: string; key: string; name: string }>
  createdAt: string
  updatedAt: string
}

export interface UsersFilters {
  page?: number
  limit?: number
  search?: string
  role?: string
  status?: UserStatus | ''
}

export interface UsersResponse {
  data: User[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface CreateUserDto {
  fullName: string
  email: string
  password: string
  role?: UserRole
  status?: UserStatus
  unit?: string
}

export interface UpdateUserDto {
  fullName?: string
  role?: UserRole
  status?: UserStatus
  unit?: string
}

export interface AssignRoleDto {
  roleIds: string[]
}

export interface AssignPermissionsDto {
  permissionIds: string[]
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const usersKeys = {
  all: ['users'] as const,
  lists: () => [...usersKeys.all, 'list'] as const,
  list: (filters: UsersFilters) => [...usersKeys.lists(), filters] as const,
  details: () => [...usersKeys.all, 'detail'] as const,
  detail: (id: string) => [...usersKeys.details(), id] as const,
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useUsers(filters: UsersFilters = {}) {
  return useQuery({
    queryKey: usersKeys.list(filters),
    queryFn: () => api.get<never, UsersResponse>('/users', { params: filters }),
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: usersKeys.detail(id),
    queryFn: () => api.get<never, User>(`/users/${id}`),
    enabled: !!id,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUserDto) => api.post<never, User>('/users', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: usersKeys.lists() })
    },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      api.put<never, User>(`/users/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: usersKeys.lists() })
      qc.invalidateQueries({ queryKey: usersKeys.detail(id) })
    },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: usersKeys.lists() })
    },
  })
}

export function useAssignRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: AssignRoleDto }) =>
      api.put<never, User>(`/users/${userId}/roles`, data),
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: usersKeys.detail(userId) })
      qc.invalidateQueries({ queryKey: usersKeys.lists() })
    },
  })
}

export function useAssignPermissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: AssignPermissionsDto }) =>
      api.put<never, User>(`/users/${userId}/permissions`, data),
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: usersKeys.detail(userId) })
    },
  })
}
