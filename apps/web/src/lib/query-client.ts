import { QueryClient } from '@tanstack/react-query'
import { dispatchToast } from '@/hooks/use-toast'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // PERF FIX: shorter global staleTime — per-query overrides where appropriate
      // Fast-changing data (users, posts, feedbacks): 30s
      // Reference data (forms, facilities): set staleTime: 5min in their hooks
      staleTime: 30 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error: unknown) => {
        const message =
          typeof error === 'string'
            ? error
            : (error as { message?: string })?.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.'
        dispatchToast({ type: 'error', message })
        console.error('[Mutation error]', error)
      },
    },
  },
})
