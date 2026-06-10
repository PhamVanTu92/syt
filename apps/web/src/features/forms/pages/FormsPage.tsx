import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import {
  useForms,
  useCreateForm,
  useUpdateForm,
  useDeleteForm,
  type SurveyForm,
  type FormsFilters,
  type FormType,
  type FormStatus,
} from '../api/forms.queries'
import { useHasAnyPermission } from '@/hooks/use-permission'

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<FormType, string> = {
  reflect: 'Phản ánh',
  evaluate: 'Đánh giá',
}

const TYPE_CLASSES: Record<FormType, string> = {
  reflect: 'bg-orange-100 text-orange-700',
  evaluate: 'bg-teal-100 text-teal-700',
}

const STATUS_LABELS: Record<FormStatus, string> = {
  active: 'Hoạt động',
  inactive: 'Ngừng hoạt động',
  draft: 'Nháp',
}

const STATUS_CLASSES: Record<FormStatus, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  draft: 'bg-yellow-100 text-yellow-700',
}

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const formSchema = z.object({
  name: z.string().min(3, 'Tên biểu mẫu ít nhất 3 ký tự'),
  description: z.string().optional(),
  type: z.enum(['reflect', 'evaluate'] as const),
  status: z.enum(['active', 'inactive', 'draft'] as const),
})

type FormFormValues = z.infer<typeof formSchema>

// ─── Create Dialog ────────────────────────────────────────────────────────────

interface CreateFormDialogProps {
  open: boolean
  onClose: () => void
}

function CreateFormDialog({ open, onClose }: CreateFormDialogProps) {
  const createForm = useCreateForm()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { type: 'reflect', status: 'draft' },
  })

  const onSubmit = async (values: FormFormValues) => {
    try {
      await createForm.mutateAsync(values)
      reset()
      onClose()
    } catch {
      // handled
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Tạo biểu mẫu mới</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-5">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tên biểu mẫu <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Biểu mẫu phản ánh chất lượng khám bệnh..."
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Mô tả mục đích, phạm vi của biểu mẫu..."
            />
          </div>

          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Loại</label>
              <select
                {...register('type')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="reflect">Phản ánh</option>
                <option value="evaluate">Đánh giá</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Trạng thái</label>
              <select
                {...register('status')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="draft">Nháp</option>
                <option value="active">Hoạt động</option>
                <option value="inactive">Ngừng hoạt động</option>
              </select>
            </div>
          </div>

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
              {isSubmitting ? 'Đang tạo...' : 'Tạo biểu mẫu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Edit Dialog ─────────────────────────────────────────────────────────────

interface EditFormDialogProps {
  form: SurveyForm | null
  onClose: () => void
}

function EditFormDialog({ form, onClose }: EditFormDialogProps) {
  const updateForm = useUpdateForm()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '', type: 'reflect', status: 'active' },
  })

  // HIGH FIX: reset form when editing target changes
  useEffect(() => {
    if (!form) return
    reset({
      name: form.name,
      description: form.description ?? '',
      type: (form.type as FormType) ?? 'reflect',
      status: (form.status as FormStatus) ?? 'active',
    })
  }, [form, reset])

  const onSubmit = async (values: FormFormValues) => {
    if (!form) return
    try {
      await updateForm.mutateAsync({ id: form.id, data: values })
      onClose()
    } catch { /* handled */ }
  }

  if (!form) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Chỉnh sửa biểu mẫu</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tên biểu mẫu <span className="text-red-500">*</span></label>
            <input {...register('name')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả</label>
            <textarea {...register('description')} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Loại</label>
              <select {...register('type')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
                <option value="reflect">Phản ánh</option>
                <option value="evaluate">Đánh giá</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Trạng thái</label>
              <select {...register('status')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Ngừng hoạt động</option>
                <option value="draft">Nháp</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={isSubmitting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              {isSubmitting ? 'Đang lưu...' : 'Cập nhật'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

interface DeleteConfirmProps {
  form: SurveyForm | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

function DeleteConfirmDialog({ form, isDeleting, onClose, onConfirm }: DeleteConfirmProps) {
  if (!form) return null
  const hasFeedbacks = (form._count?.feedbacks ?? 0) > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="px-6 py-5">
          <h3 className="text-base font-semibold text-gray-900">Xác nhận xoá biểu mẫu</h3>
          <p className="mt-2 text-sm text-gray-600">
            Bạn có chắc muốn xoá biểu mẫu{' '}
            <span className="font-medium text-gray-900">{form.name}</span>?
          </p>
          {hasFeedbacks && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-yellow-50 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Biểu mẫu này có{' '}
                <span className="font-semibold">{form._count!.feedbacks}</span> phản hồi đã ghi nhận.
                Việc xoá có thể ảnh hưởng đến dữ liệu thống kê.
              </p>
            </div>
          )}
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
              {isDeleting ? 'Đang xoá...' : 'Xoá biểu mẫu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FormsPage() {
  const canManage = useHasAnyPermission(['reflect.form', 'evaluate.form'])

  const [filters, setFilters] = useState<FormsFilters>({
    page: 1,
    limit: 15,
    type: '',
    status: '',
  })
  const [createOpen, setCreateOpen] = useState(false)
  const [editingForm, setEditingForm] = useState<SurveyForm | null>(null) // HIGH FIX: add edit state
  const [deletingForm, setDeletingForm] = useState<SurveyForm | null>(null)

  const { data, isLoading, isError } = useForms(filters)
  const deleteForm = useDeleteForm()

  const forms = data?.data ?? []
  const meta = data?.meta

  const updateFilter = (patch: Partial<FormsFilters>) =>
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }))

  const handleDelete = async () => {
    if (!deletingForm) return
    await deleteForm.mutateAsync(deletingForm.id)
    setDeletingForm(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Biểu mẫu khảo sát</h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý biểu mẫu phản ánh và đánh giá chất lượng dịch vụ
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Tạo biểu mẫu
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.type ?? ''}
          onChange={(e) => updateFilter({ type: e.target.value as FormType | '' })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Tất cả loại</option>
          <option value="reflect">Phản ánh</option>
          <option value="evaluate">Đánh giá</option>
        </select>
        <select
          value={filters.status ?? ''}
          onChange={(e) => updateFilter({ status: e.target.value as FormStatus | '' })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="draft">Nháp</option>
          <option value="inactive">Ngừng hoạt động</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tên biểu mẫu
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Loại
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Trạng thái
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Số mục
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Phản hồi
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
                <td colSpan={7} className="py-12 text-center text-sm text-gray-500">
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-red-500">
                  Không thể tải dữ liệu. Vui lòng thử lại.
                </td>
              </tr>
            )}
            {!isLoading && !isError && forms.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-gray-500">
                  Chưa có biểu mẫu nào.
                </td>
              </tr>
            )}
            {forms.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <p className="text-sm font-medium text-gray-900">{f.name}</p>
                  {f.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{f.description}</p>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_CLASSES[f.type]}`}
                  >
                    {TYPE_LABELS[f.type]}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[f.status]}`}
                  >
                    {STATUS_LABELS[f.status]}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm text-gray-500">
                  {f._count?.sections ?? f.sections.length}
                </td>
                <td className="px-5 py-3 text-sm text-gray-500">
                  {f._count?.feedbacks ?? 0}
                </td>
                <td className="px-5 py-3 text-sm text-gray-500">
                  {format(new Date(f.createdAt), 'dd/MM/yyyy', { locale: vi })}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {canManage && (
                      <>
                        {/* HIGH FIX: add Edit button */}
                        <button
                          onClick={() => setEditingForm(f)}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                          title="Chỉnh sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingForm(f)}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Xoá"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
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
              {Math.min(meta.page * meta.limit, meta.total)} / {meta.total} biểu mẫu
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                disabled={meta.page <= 1}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                ← Trước
              </button>
              {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => {
                const page = i + 1
                return (
                  <button
                    key={page}
                    onClick={() => setFilters((flt) => ({ ...flt, page }))}
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
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Tiếp →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {/* HIGH FIX: Edit dialog */}
      <EditFormDialog form={editingForm} onClose={() => setEditingForm(null)} />
      <DeleteConfirmDialog
        form={deletingForm}
        isDeleting={deleteForm.isPending}
        onClose={() => setDeletingForm(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
