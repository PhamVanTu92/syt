import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Permission {
  id: number
  key: string
  name: string
  description: string | null
  parentKey: string | null
  parent?: Permission | null
  children?: Permission[]
}

export interface Role {
  id: number
  name: string
  description: string | null
  permissions: Permission[]
  _count?: {
    users: number
    permissions: number
  }
}

export interface RolesResponse {
  data: Role[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface PermissionsResponse {
  data: Permission[]
}

export interface CreateRoleDto {
  name: string
  description?: string
}

export type UpdateRoleDto = Partial<CreateRoleDto>

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const rolesKeys = {
  all: ['roles'] as const,
  lists: () => [...rolesKeys.all, 'list'] as const,
  list: () => [...rolesKeys.lists()] as const,
  details: () => [...rolesKeys.all, 'detail'] as const,
  detail: (id: number) => [...rolesKeys.details(), id] as const,
  permissions: ['permissions'] as const,
  permissionsList: () => [...rolesKeys.permissions, 'list'] as const,
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useRoles() {
  return useQuery({
    queryKey: rolesKeys.list(),
    queryFn: () => api.get<never, RolesResponse>('/roles'),
    staleTime: 5 * 60 * 1000, // PERF: roles change rarely
  })
}

export function useRole(id: number) {
  return useQuery({
    queryKey: rolesKeys.detail(id),
    queryFn: () => api.get<never, Role>(`/roles/${id}`),
    enabled: id > 0,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePermissions() {
  return useQuery({
    queryKey: rolesKeys.permissionsList(),
    queryFn: () => api.get<never, PermissionsResponse>('/permissions'),
    staleTime: 10 * 60 * 1000, // PERF: permissions almost never change — 10min
  })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRoleDto) => api.post<never, Role>('/roles', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rolesKeys.lists() })
    },
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRoleDto }) =>
      api.put<never, Role>(`/roles/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: rolesKeys.lists() })
      qc.invalidateQueries({ queryKey: rolesKeys.detail(id) })
    },
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rolesKeys.lists() })
    },
  })
}

export function useAssignPermissionsToRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, permissionIds }: { id: number; permissionIds: number[] }) =>
      api.post(`/roles/${id}/permissions`, { permissionIds }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: rolesKeys.lists() })
      qc.invalidateQueries({ queryKey: rolesKeys.detail(id) })
    },
  })
}
