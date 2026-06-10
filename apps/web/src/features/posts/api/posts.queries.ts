import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PostStatus = 'draft' | 'published' | 'archived'

export interface Post {
  id: string
  title: string
  slug: string
  summary: string | null
  content: string
  status: PostStatus
  isFeatured: boolean
  viewCount: number
  categoryId: string | null
  authorId: string
  author: {
    id: string
    fullName: string
    email: string
  }
  category: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

export interface PostsFilters {
  page?: number
  limit?: number
  search?: string
  status?: PostStatus | ''
  categoryId?: string
}

export interface PostsResponse {
  data: Post[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface CreatePostDto {
  title: string
  summary?: string
  content: string
  status: PostStatus
  isFeatured?: boolean
  categoryId?: string
}

export type UpdatePostDto = Partial<CreatePostDto>

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const postsKeys = {
  all: ['posts'] as const,
  lists: () => [...postsKeys.all, 'list'] as const,
  list: (filters: PostsFilters) => [...postsKeys.lists(), filters] as const,
  details: () => [...postsKeys.all, 'detail'] as const,
  detail: (id: string) => [...postsKeys.details(), id] as const,
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePosts(filters: PostsFilters = {}) {
  return useQuery({
    queryKey: postsKeys.list(filters),
    queryFn: () =>
      api.get<never, PostsResponse>('/posts/admin', { params: filters }),
  })
}

export function usePost(id: string) {
  return useQuery({
    queryKey: postsKeys.detail(id),
    queryFn: () => api.get<never, Post>(`/posts/${id}`),
    enabled: !!id,
  })
}

export function useCreatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePostDto) =>
      api.post<never, Post>('/posts', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: postsKeys.lists() })
    },
  })
}

export function useUpdatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePostDto }) =>
      api.put<never, Post>(`/posts/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: postsKeys.lists() })
      qc.invalidateQueries({ queryKey: postsKeys.detail(id) })
    },
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/posts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: postsKeys.lists() })
    },
  })
}
