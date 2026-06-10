import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Plus, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react'
import {
  useSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useApproveSchedule,
  useLeaders,
  type Schedule,
  type SchedulesFilters,
  type ScheduleStatus,
  type SchedulePriority,
} from '../api/schedules.queries'
import { usePermission } from '@/hooks/use-permission'
import { useAuthStore } from '@/store/auth.store'
import { useToast } from '@/hooks/use-toast'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  DRAFT: 'Nháp',
  APPROVED: 'Đã duyệt',
  CANCELLED: 'Đã hủy',
}

const STATUS_CLASSES: Record<ScheduleStatus, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-700',
}

const PRIORITY_LABELS: Record<SchedulePriority, string> = {
  NORMAL: 'Thường',
  IMPORTANT: 'Quan trọng',
  URGENT: 'Khẩn',
}

const PRIORITY_CLASSES: Record<SchedulePriority, string> = {
  NORMAL: 'bg-gray-100 text-gray-600',
  IMPORTANT: 'bg-blue-100 text-blue-700',
  URGENT: 'bg-red-100 text-red-700',
}

function formatDateTime(iso: string) {
  try {
    return format(new Date(iso), 'dd/MM/yyyy HH:mm', { locale: vi })
  } catch {
    return iso
  }
}

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const scheduleSchema = z.object({
  title: z.string().min(3, 'Tiêu đề ít nhất 3 ký tự'),
  content: z.string().optional(),
  startTime: z.string().min(1, 'Vui lòng chọn thời gian bắt đầu'),
  endTime: z.string().optional(),
  location: z.string().optional(),
  priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT'] as const),
  presider: z.string().optional(),
})

type ScheduleFormValues = z.infer<typeof scheduleSchema>

// ─── Create / Edit Dialog ─────────────────────────────────────────────────────

interface ScheduleDialogProps {
  schedule: Schedule | null
  onClose: () => void
}

function ScheduleDialog({ schedule, onClose }: ScheduleDialogProps) {
  const isEdit = schedule !== null
  const createSchedule = useCreateSchedule()
  const updateSchedule = useUpdateSchedule()
  const { data: leadersData } = useLeaders()
  const leaders = leadersData?.data ?? []

  const toLocalDatetime = (iso: string) => {
    try {
      return format(new Date(iso), "yyyy-MM-dd'T'HH:mm")
    } catch {
      return ''
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: isEdit
      ? {
          title: schedule.title,
          content: schedule.content ?? '',
          startTime: toLocalDatetime(schedule.startTime),
          endTime: schedule.endTime ? toLocalDatetime(schedule.endTime) : '',
          location: schedule.location ?? '',
          priority: schedule.priority,
          presider: schedule.presider ?? '',
        }
      : { priority: 'NORMAL', title: '', content: '', location: '', presider: '' },
  })

  const onSubmit = async (values: ScheduleFormValues) => {
    try {
      const dto = {
        ...values,
        startTime: new Date(values.startTime).toISOString(),
        endTime: values.endTime ? new Date(values.endTime).toISOString() : undefined,
      }
      if (isEdit) {
        await updateSchedule.mutateAsync({ id: schedule.id, data: dto })
      } else {
        await createSchedule.mutateAsync(dto)
        reset()
      }
      onClose()
    } catch {
      // handled
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Chỉnh sửa lịch công tác' : 'Tạo lịch công tác'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-5">
          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              {...register('title')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Tên cuộc họp / công tác..."
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nội dung</label>
            <textarea
              {...register('content')}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Mô tả nội dung công tác..."
            />
          </div>

          {/* Start/End time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Thời gian bắt đầu <span className="text-red-500">*</span>
              </label>
              <input
                {...register('startTime')}
                type="datetime-local"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {errors.startTime && (
                <p className="mt-1 text-xs text-red-500">{errors.startTime.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Thời gian kết thúc
              </label>
              <input
                {...register('endTime')}
                type="datetime-local"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Location + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Địa điểm</label>
              <input
                {...register('location')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Phòng họp, địa chỉ..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Mức độ ưu tiên</label>
              <select
                {...register('priority')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="NORMAL">Thường</option>
                <option value="IMPORTANT">Quan trọng</option>
                <option value="URGENT">Khẩn</option>
              </select>
            </div>
          </div>

          {/* Presider */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Chủ trì</label>
            <select
              {...register('presider')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="">-- Chọn người chủ trì --</option>
              {leaders.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.fullName} {l.unit ? `(${l.unit})` : ''}
                </option>
              ))}
            </select>
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
              {isSubmitting ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo lịch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

interface DeleteConfirmProps {
  schedule: Schedule | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

function DeleteConfirmDialog({ schedule, isDeleting, onClose, onConfirm }: DeleteConfirmProps) {
  if (!schedule) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="px-6 py-5">
          <h3 className="text-base font-semibold text-gray-900">Xác nhận xoá lịch</h3>
          <p className="mt-2 text-sm text-gray-600">
            Bạn có chắc muốn xoá lịch{' '}
            <span className="font-medium text-gray-900">{schedule.title}</span>? Hành động này
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SchedulesPage() {
  const canCreate = usePermission('work_schedule.create')
  const canApprove = usePermission('work_schedule.approve')
  const currentUser = useAuthStore((s) => s.user)
  const toast = useToast() // MEDIUM FIX: add toast feedback for approve/cancel

  const [filters, setFilters] = useState<SchedulesFilters>({
    page: 1,
    limit: 15,
    status: '',
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null)

  const { data, isLoading, isError } = useSchedules(filters)
  const deleteSchedule = useDeleteSchedule()
  const approveSchedule = useApproveSchedule()

  const schedules = data?.data ?? []
  const meta = data?.meta

  const updateFilter = (patch: Partial<SchedulesFilters>) =>
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }))

  const handleDelete = async () => {
    if (!deletingSchedule) return
    await deleteSchedule.mutateAsync(deletingSchedule.id)
    setDeletingSchedule(null)
  }

  const handleApprove = (schedule: Schedule, action: 'APPROVED' | 'CANCELLED') => {
    approveSchedule.mutate(
      { id: schedule.id, action },
      {
        onSuccess: () => {
          // MEDIUM FIX: show success toast after approve/cancel
          toast.success(action === 'APPROVED' ? 'Đã duyệt lịch công tác' : 'Đã hủy lịch công tác')
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Lịch công tác</h1>
          <p className="mt-1 text-sm text-gray-500">Quản lý lịch công tác và cuộc họp</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Tạo lịch công tác
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.status ?? ''}
          onChange={(e) => updateFilter({ status: e.target.value as ScheduleStatus | '' })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Nháp</option>
          <option value="APPROVED">Đã duyệt</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
        <input
          type="date"
          value={filters.startDate ?? ''}
          onChange={(e) => updateFilter({ startDate: e.target.value })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          placeholder="Từ ngày"
        />
        <input
          type="date"
          value={filters.endDate ?? ''}
          onChange={(e) => updateFilter({ endDate: e.target.value })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          placeholder="Đến ngày"
        />
        {(filters.startDate || filters.endDate || filters.status) && (
          <button
            onClick={() => updateFilter({ startDate: '', endDate: '', status: '' })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Xóa bộ lọc
          </button>
        )}
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
                Ưu tiên
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Địa điểm
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Thời gian
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Người tạo
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
            {!isLoading && !isError && schedules.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-gray-500">
                  Chưa có lịch công tác nào.
                </td>
              </tr>
            )}
            {schedules.map((s) => {
              const isOwner = currentUser?.id === s.creatorId
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-900">{s.title}</p>
                    {s.content && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{s.content}</p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[s.status]}`}
                    >
                      {STATUS_LABELS[s.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_CLASSES[s.priority]}`}
                    >
                      {PRIORITY_LABELS[s.priority]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{s.location ?? '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {formatDateTime(s.startTime)}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{s.creator.fullName}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Approve/Cancel — only for approvers when status is DRAFT */}
                      {canApprove && s.status === 'DRAFT' && (
                        <>
                          <button
                            onClick={() => handleApprove(s, 'APPROVED')}
                            disabled={approveSchedule.isPending}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600"
                            title="Duyệt"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleApprove(s, 'CANCELLED')}
                            disabled={approveSchedule.isPending}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            title="Hủy lịch"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {/* Edit — for owner or if status is DRAFT */}
                      {(isOwner || canApprove) && s.status === 'DRAFT' && (
                        <button
                          onClick={() => setEditingSchedule(s)}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                          title="Chỉnh sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {/* Delete — only for owner */}
                      {isOwner && (
                        <button
                          onClick={() => setDeletingSchedule(s)}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Xoá"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
            <p className="text-sm text-gray-500">
              Hiển thị {(meta.page - 1) * meta.limit + 1}–
              {Math.min(meta.page * meta.limit, meta.total)} / {meta.total} lịch
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
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Tiếp →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {createOpen && <ScheduleDialog schedule={null} onClose={() => setCreateOpen(false)} />}
      {editingSchedule && (
        <ScheduleDialog schedule={editingSchedule} onClose={() => setEditingSchedule(null)} />
      )}
      <DeleteConfirmDialog
        schedule={deletingSchedule}
        isDeleting={deleteSchedule.isPending}
        onClose={() => setDeletingSchedule(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
