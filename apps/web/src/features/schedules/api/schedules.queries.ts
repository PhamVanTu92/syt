import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScheduleStatus = 'DRAFT' | 'APPROVED' | 'CANCELLED'
export type SchedulePriority = 'NORMAL' | 'IMPORTANT' | 'URGENT'

export interface ScheduleCreator {
  id: string
  fullName: string
  email: string
}

export interface Schedule {
  id: string
  title: string
  content: string | null
  status: ScheduleStatus
  priority: SchedulePriority
  location: string | null
  startTime: string
  endTime: string | null
  presider: string | null
  creatorId: string
  creator: ScheduleCreator
  createdAt: string
  updatedAt: string
}

export interface SchedulesFilters {
  page?: number
  limit?: number
  status?: ScheduleStatus | ''
  unit?: string
  startDate?: string
  endDate?: string
}

export interface SchedulesResponse {
  data: Schedule[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface Leader {
  id: string
  fullName: string
  email: string
  unit?: string | null
}

export interface LeadersResponse {
  data: Leader[]
}

export interface CreateScheduleDto {
  title: string
  content?: string
  startTime: string
  endTime?: string
  location?: string
  priority: SchedulePriority
  presider?: string
}

export type UpdateScheduleDto = Partial<CreateScheduleDto>

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const schedulesKeys = {
  all: ['schedules'] as const,
  lists: () => [...schedulesKeys.all, 'list'] as const,
  list: (filters: SchedulesFilters) => [...schedulesKeys.lists(), filters] as const,
  details: () => [...schedulesKeys.all, 'detail'] as const,
  detail: (id: string) => [...schedulesKeys.details(), id] as const,
  leaders: ['schedules', 'leaders'] as const, // HIGH FIX: was ['users','leaders'] — wrong namespace
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useSchedules(filters: SchedulesFilters = {}) {
  return useQuery({
    queryKey: schedulesKeys.list(filters),
    queryFn: () => api.get<never, SchedulesResponse>('/schedules', { params: filters }),
  })
}

export function useLeaders() {
  return useQuery({
    queryKey: schedulesKeys.leaders,
    queryFn: () => api.get<never, LeadersResponse>('/users/leaders'),
  })
}

export function useCreateSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateScheduleDto) =>
      api.post<never, Schedule>('/schedules', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedulesKeys.lists() })
    },
  })
}

export function useUpdateSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduleDto }) =>
      api.put<never, Schedule>(`/schedules/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: schedulesKeys.lists() })
      qc.invalidateQueries({ queryKey: schedulesKeys.detail(id) })
    },
  })
}

export function useDeleteSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/schedules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedulesKeys.lists() })
    },
  })
}

export function useApproveSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string
      action: 'APPROVED' | 'CANCELLED'
    }) => api.patch<never, Schedule>(`/schedules/${id}/approve`, { action }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: schedulesKeys.lists() })
      qc.invalidateQueries({ queryKey: schedulesKeys.detail(id) })
    },
  })
}
