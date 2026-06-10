import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Pencil, Trash2, Plus, Search, Eye } from 'lucide-react'
import {
  usePosts,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
  type Post,
  type PostStatus,
  type PostsFilters,
} from '../api/posts.queries'
import { usePermission } from '@/hooks/use-permission'
import { useDebounce } from '@/hooks/use-debounce'
import { useUrlPagination } from '@/hooks/use-url-pagination'

// ─── Zod schema ───────────────────────────────────────────────────────────────

const postSchema = z.object({
  title: z.string().min(3, 'Tiêu đề ít nhất 3 ký tự'),
  summary: z.string().optional(),
  content: z.string().min(10, 'Nội dung ít nhất 10 ký tự'),
  status: z.enum(['draft', 'published', 'archived'] as const),
  isFeatured: z.boolean().optional(),
  categoryId: z.string().optional(),
})

type PostFormValues = z.infer<typeof postSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Nháp',
  published: 'Đã đăng',
  archived: 'Lưu trữ',
}

const STATUS_CLASSES: Record<PostStatus, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PostStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

interface PostFormDialogProps {
  open: boolean
  editing: Post | null
  onClose: () => void
}

function PostFormDialog({ open, editing, onClose }: PostFormDialogProps) {
  const createPost = useCreatePost()
  const updatePost = useUpdatePost()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: editing
      ? {
          title: editing.title,
          summary: editing.summary ?? '',
          content: editing.content,
          status: editing.status,
          isFeatured: editing.isFeatured,
        }
      : {
          title: '',
          summary: '',
          content: '',
          status: 'draft',
          isFeatured: false,
        },
  })

  // CRITICAL FIX: use useEffect to reset form when dialog opens or editing changes
  useEffect(() => {
    if (!open) return
    reset(
      editing
        ? {
            title: editing.title,
            summary: editing.summary ?? '',
            content: editing.content,
            status: editing.status,
            isFeatured: editing.isFeatured ?? false,
          }
        : { title: '', summary: '', content: '', status: 'draft', isFeatured: false },
    )
  }, [open, editing, reset])

  const onSubmit = async (values: PostFormValues) => {
    try {
      if (editing) {
        await updatePost.mutateAsync({ id: editing.id, data: values })
      } else {
        await createPost.mutateAsync(values)
      }
      onClose()
    } catch {
      // error handled by query client
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-5">
          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              {...register('title')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Nhập tiêu đề bài viết"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Summary */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tóm tắt</label>
            <input
              {...register('summary')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Tóm tắt ngắn gọn"
            />
          </div>

          {/* Content */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nội dung <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('content')}
              rows={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Nội dung bài viết..."
            />
            {errors.content && (
              <p className="mt-1 text-xs text-red-500">{errors.content.message}</p>
            )}
          </div>

          {/* Status + isFeatured */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Trạng thái</label>
              <select
                {...register('status')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="draft">Nháp</option>
                <option value="published">Đã đăng</option>
                <option value="archived">Lưu trữ</option>
              </select>
            </div>
            <div className="flex items-end gap-2 pb-1">
              <input
                type="checkbox"
                id="isFeatured"
                {...register('isFeatured')}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <label htmlFor="isFeatured" className="text-sm font-medium text-gray-700">
                Bài nổi bật
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Tạo bài viết'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface DeleteConfirmDialogProps {
  post: Post | null
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
}

function DeleteConfirmDialog({
  post,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteConfirmDialogProps) {
  if (!post) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="px-6 py-5">
          <h3 className="text-base font-semibold text-gray-900">Xác nhận xoá</h3>
          <p className="mt-2 text-sm text-gray-600">
            Bạn có chắc muốn xoá bài viết{' '}
            <span className="font-medium text-gray-900">"{post.title}"</span>? Hành động này
            không thể hoàn tác.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {isDeleting ? 'Đang xoá...' : 'Xoá'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const canCreate = usePermission('posts.create')
  const canDelete = usePermission('posts.delete')

  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300) // MEDIUM FIX: debounce search

  // PERF FIX: page synced to URL — survives F5 and back button
  const { page, setPage } = useUrlPagination()
  const [filters, setFilters] = useState<PostsFilters>({
    page,
    limit: 15,
    search: '',
    status: '',
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Post | null>(null)
  const [deletingPost, setDeletingPost] = useState<Post | null>(null)

  // Sync debounced search to filters
  useEffect(() => {
    setFilters((prev) => ({ ...prev, search: debouncedSearch, page: 1 }))
  }, [debouncedSearch])

  const { data, isLoading, isError } = usePosts(filters)
  const deletePost = useDeletePost()

  const posts = data?.data ?? []
  const meta = data?.meta

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (post: Post) => {
    setEditing(post)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingPost) return
    await deletePost.mutateAsync(deletingPost.id)
    setDeletingPost(null)
  }

  const updateFilter = (patch: Partial<PostsFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }))
    if (!('page' in patch)) setPage(1) // reset URL page on filter change
  }

  const gotoPage = (p: number) => {
    setFilters((prev) => ({ ...prev, page: p }))
    setPage(p)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Quản lý tin tức</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tạo và quản lý các bài viết, thông báo trên cổng thông tin
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Tạo bài viết
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)} /* MEDIUM FIX: use debounced state */
            placeholder="Tìm kiếm bài viết..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={filters.status ?? ''}
          onChange={(e) => updateFilter({ status: e.target.value as PostStatus | '' })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="draft">Nháp</option>
          <option value="published">Đã đăng</option>
          <option value="archived">Lưu trữ</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tiêu đề
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Trạng thái
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tác giả
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Lượt xem
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Ngày tạo
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-gray-500">
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-red-500">
                  Không thể tải dữ liệu. Vui lòng thử lại.
                </td>
              </tr>
            )}
            {!isLoading && !isError && posts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-gray-500">
                  Chưa có bài viết nào.
                </td>
              </tr>
            )}
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-gray-50">
                <td className="max-w-xs px-5 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="truncate text-sm font-medium text-gray-900">
                      {post.title}
                    </span>
                    {post.isFeatured && (
                      <span className="text-xs text-blue-600 font-medium">★ Nổi bật</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={post.status} />
                </td>
                <td className="px-5 py-3 text-sm text-gray-600">
                  {post.author?.fullName ?? '—'}
                </td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                    <Eye className="h-3.5 w-3.5" />
                    {post.viewCount.toLocaleString('vi')}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm text-gray-500">
                  {format(new Date(post.createdAt), 'dd/MM/yyyy', { locale: vi })}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(post)}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                      title="Chỉnh sửa"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => setDeletingPost(post)}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Xoá"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
            <p className="text-sm text-gray-500">
              Hiển thị {(meta.page - 1) * meta.limit + 1}–
              {Math.min(meta.page * meta.limit, meta.total)} / {meta.total} bài viết
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                disabled={meta.page <= 1}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Trước
              </button>
              {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => {
                const page = i + 1
                return (
                  <button
                    key={page}
                    onClick={() => setFilters((f) => ({ ...f, page }))}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                      meta.page === page
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
              <button
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                disabled={meta.page >= meta.totalPages}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Tiếp →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <PostFormDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => {
          setDialogOpen(false)
          setEditing(null)
        }}
      />
      <DeleteConfirmDialog
        post={deletingPost}
        onClose={() => setDeletingPost(null)}
        onConfirm={handleDelete}
        isDeleting={deletePost.isPending}
      />
    </div>
  )
}
