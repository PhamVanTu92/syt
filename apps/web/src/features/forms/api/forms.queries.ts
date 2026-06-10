import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FormType = 'reflect' | 'evaluate'
export type FormStatus = 'active' | 'inactive' | 'draft'

export interface FormSection {
  id: string
  title: string
  order: number
  questions?: FormQuestion[]
}

export interface FormQuestion {
  id: string
  text: string
  type: string
  order: number
}

export interface SurveyForm {
  id: string
  name: string
  description: string | null
  type: FormType
  status: FormStatus
  sections: FormSection[]
  _count?: {
    sections: number
    feedbacks: number
  }
  createdAt: string
  updatedAt: string
}

export interface FormsFilters {
  page?: number
  limit?: number
  type?: FormType | ''
  status?: FormStatus | ''
}

export interface FormsResponse {
  data: SurveyForm[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface CreateFormDto {
  name: string
  description?: string
  type: FormType
  status: FormStatus
}

export type UpdateFormDto = Partial<CreateFormDto>

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const formsKeys = {
  all: ['forms'] as const,
  lists: () => [...formsKeys.all, 'list'] as const,
  list: (filters: FormsFilters) => [...formsKeys.lists(), filters] as const,
  details: () => [...formsKeys.all, 'detail'] as const,
  detail: (id: string) => [...formsKeys.details(), id] as const,
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useForms(filters: FormsFilters = {}) {
  return useQuery({
    queryKey: formsKeys.list(filters),
    queryFn: () => api.get<never, FormsResponse>('/forms', { params: filters }),
    staleTime: 5 * 60 * 1000, // PERF: forms change rarely — 5min cache
  })
}

export function useForm(id: string) {
  return useQuery({
    queryKey: formsKeys.detail(id),
    queryFn: () => api.get<never, SurveyForm>(`/forms/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // PERF: form structure changes rarely
  })
}

export function useCreateForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFormDto) => api.post<never, SurveyForm>('/forms', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formsKeys.lists() })
    },
  })
}

export function useUpdateForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFormDto }) =>
      api.put<never, SurveyForm>(`/forms/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: formsKeys.lists() })
      qc.invalidateQueries({ queryKey: formsKeys.detail(id) })
    },
  })
}

export function useDeleteForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/forms/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formsKeys.lists() })
    },
  })
}
