import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FeedbackType = 'reflect' | 'evaluate'
export type FeedbackStatus = 'pending' | 'approved' | 'rejected'
export type FeedbackSource = 'QR' | 'WEB'

export interface FeedbackCreator {
  id: string
  fullName: string
  email: string
}

export interface FeedbackSectionAnswer {
  sectionId: string
  sectionTitle: string
  answers: {
    questionId: string
    questionText: string
    value: string | number | null
  }[]
}

export interface Feedback {
  id: string
  type: FeedbackType
  status: FeedbackStatus
  source: FeedbackSource
  surveyKey: string | null
  facilityId: string | null
  creatorId: string | null
  creator: FeedbackCreator | null
  sections: FeedbackSectionAnswer[]
  data: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface FeedbacksFilters {
  page?: number
  limit?: number
  type?: FeedbackType | ''
  status?: FeedbackStatus | ''
  surveyKey?: string
  facilityId?: string
  startDate?: string
  endDate?: string
}

export interface FeedbacksResponse {
  data: Feedback[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface FeedbackStats {
  total: number
  pending: number
  approved: number
  rejected: number
}

export interface FacilityStatusItem {
  facilityId: string
  facilityName: string
  total: number
  pending: number
  approved: number
  rejected: number
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const feedbacksKeys = {
  all: ['feedbacks'] as const,
  lists: () => [...feedbacksKeys.all, 'list'] as const,
  list: (filters: FeedbacksFilters) => [...feedbacksKeys.lists(), filters] as const,
  details: () => [...feedbacksKeys.all, 'detail'] as const,
  detail: (id: string) => [...feedbacksKeys.details(), id] as const,
  // PERF FIX: stats don't depend on page/limit — exclude from key to improve cache hits
  stats: (query: Omit<FeedbacksFilters, 'page' | 'limit'>) =>
    [...feedbacksKeys.all, 'stats', {
      type: query.type, status: query.status, surveyKey: query.surveyKey,
      facilityId: query.facilityId, startDate: query.startDate, endDate: query.endDate,
    }] as const,
  facilityStatus: (surveyId: string) => [...feedbacksKeys.all, 'facility-status', surveyId] as const,
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useFeedbacks(filters: FeedbacksFilters = {}) {
  return useQuery({
    queryKey: feedbacksKeys.list(filters),
    queryFn: () => api.get<never, FeedbacksResponse>('/feedbacks', { params: filters }),
  })
}

export function useFeedbackStats(query: FeedbacksFilters = {}) {
  return useQuery({
    queryKey: feedbacksKeys.stats(query),
    queryFn: () => api.post<never, FeedbackStats>('/feedbacks/stats', query),
  })
}

export function useSurveyFacilityStatus(surveyId: string) {
  return useQuery({
    queryKey: feedbacksKeys.facilityStatus(surveyId),
    queryFn: () =>
      api.get<never, { data: FacilityStatusItem[] }>(`/feedbacks/survey/${surveyId}/facility-status`),
    enabled: !!surveyId,
  })
}

export function useUpdateFeedbackStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: FeedbackStatus }) =>
      api.patch<never, Feedback>(`/feedbacks/${id}/status`, { status }),

    // PERF FIX: optimistic update — UI reflects change instantly
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: feedbacksKeys.lists() })
      const prev = qc.getQueryData<Feedback>(feedbacksKeys.detail(id))

      // Patch all list pages that contain this feedback
      qc.setQueriesData<{ data: Feedback[]; meta: unknown }>(
        { queryKey: feedbacksKeys.lists() },
        (old) => {
          if (!old) return old
          return { ...old, data: old.data.map((fb) => fb.id === id ? { ...fb, status } : fb) }
        },
      )

      return { prev }
    },

    onError: (_err, { id }, ctx) => {
      // Rollback on error
      if (ctx?.prev) qc.setQueryData(feedbacksKeys.detail(id), ctx.prev)
      qc.invalidateQueries({ queryKey: feedbacksKeys.lists() })
    },

    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: feedbacksKeys.detail(id) })
    },
  })
}

export function useDeleteFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/feedbacks/${id}`),
    onSuccess: () => {
      // MEDIUM FIX: only invalidate lists — stats recalculated on next open
      qc.invalidateQueries({ queryKey: feedbacksKeys.lists() })
    },
  })
}
