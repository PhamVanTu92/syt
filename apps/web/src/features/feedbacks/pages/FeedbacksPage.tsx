import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Eye, CheckCircle, XCircle, Trash2, MessageSquare, Star } from 'lucide-react'
import {
  useFeedbacks,
  useFeedbackStats,
  useUpdateFeedbackStatus,
  useDeleteFeedback,
  type Feedback,
  type FeedbacksFilters,
  type FeedbackType,
  type FeedbackStatus,
  type FeedbackSource,
} from '../api/feedbacks.queries'
import { useHasAnyPermission } from '@/hooks/use-permission'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
}

const STATUS_CLASSES: Record<FeedbackStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
}

const SOURCE_LABELS: Record<FeedbackSource, string> = {
  QR: 'Mã QR',
  WEB: 'Web',
}

const SOURCE_CLASSES: Record<FeedbackSource, string> = {
  QR: 'bg-purple-100 text-purple-700',
  WEB: 'bg-blue-100 text-blue-700',
}

function formatDate(iso: string) {
  try {
    return format(new Date(iso), 'dd/MM/yyyy HH:mm', { locale: vi })
  } catch {
    return iso
  }
}

// ─── Stats Cards ──────────────────────────────────────────────────────────────

interface StatsCardsProps {
  type: FeedbackType
  facilityId: string
  startDate: string
  endDate: string
}

function StatsCards({ type, facilityId, startDate, endDate }: StatsCardsProps) {
  const { data: stats, isLoading } = useFeedbackStats({
    type,
    facilityId: facilityId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  const cards = [
    { label: 'Tổng số', value: stats?.total ?? 0, color: 'bg-blue-50 text-blue-700' },
    { label: 'Chờ duyệt', value: stats?.pending ?? 0, color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Đã duyệt', value: stats?.approved ?? 0, color: 'bg-green-50 text-green-700' },
    { label: 'Từ chối', value: stats?.rejected ?? 0, color: 'bg-red-50 text-red-700' },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-xl p-4 ${c.color}`}>
          <p className="text-sm font-medium opacity-80">{c.label}</p>
          <p className="mt-1 text-2xl font-bold">
            {isLoading ? '...' : c.value.toLocaleString('vi-VN')}
          </p>
        </div>
      ))}
    </div>
  )
}

// ─── Detail Dialog ────────────────────────────────────────────────────────────

interface DetailDialogProps {
  feedback: Feedback | null
  onClose: () => void
}

function DetailDialog({ feedback, onClose }: DetailDialogProps) {
  if (!feedback) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Chi tiết phản hồi</h2>
            <p className="text-sm text-gray-500">
              {feedback.surveyKey ?? feedback.id} —{' '}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[feedback.status]}`}
              >
                {STATUS_LABELS[feedback.status]}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
          {/* Meta */}
          <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-sm">
            <div>
              <p className="text-gray-500">Loại</p>
              <p className="font-medium text-gray-800">
                {feedback.type === 'reflect' ? 'Phản ánh' : 'Đánh giá'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Nguồn</p>
              <p className="font-medium text-gray-800">{SOURCE_LABELS[feedback.source]}</p>
            </div>
            <div>
              <p className="text-gray-500">Cơ sở</p>
              <p className="font-medium text-gray-800">{feedback.facilityId ?? '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Người gửi</p>
              <p className="font-medium text-gray-800">
                {feedback.creator?.fullName ?? 'Ẩn danh'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Thời gian</p>
              <p className="font-medium text-gray-800">{formatDate(feedback.createdAt)}</p>
            </div>
          </div>

          {/* Sections — reflect */}
          {feedback.type === 'reflect' && feedback.sections.length > 0 && (
            <div className="space-y-4">
              {feedback.sections.map((section, si) => (
                <div key={si} className="rounded-lg border border-gray-200 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-800">{section.sectionTitle}</h3>
                  <div className="space-y-2">
                    {section.answers.map((ans, ai) => (
                      <div key={ai} className="flex items-start justify-between gap-4">
                        <p className="text-sm text-gray-600">{ans.questionText}</p>
                        <p className="flex-shrink-0 text-sm font-medium text-gray-900">
                          {ans.value !== null && ans.value !== undefined ? String(ans.value) : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Data — evaluate (arbitrary JSON) */}
          {feedback.type === 'evaluate' && feedback.data && (
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">Dữ liệu đánh giá</h3>
              <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs text-gray-700">
                {JSON.stringify(feedback.data, null, 2)}
              </pre>
            </div>
          )}

          {feedback.sections.length === 0 && !feedback.data && (
            <p className="py-6 text-center text-sm text-gray-500">Không có dữ liệu chi tiết.</p>
          )}
        </div>

        <div className="border-t px-6 py-4 text-right">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

interface DeleteConfirmProps {
  feedback: Feedback | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

function DeleteConfirmDialog({ feedback, isDeleting, onClose, onConfirm }: DeleteConfirmProps) {
  if (!feedback) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="px-6 py-5">
          <h3 className="text-base font-semibold text-gray-900">Xác nhận xoá phản hồi</h3>
          <p className="mt-2 text-sm text-gray-600">
            Bạn có chắc muốn xoá phản hồi này? Hành động này không thể hoàn tác.
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

// ─── Feedbacks Table ──────────────────────────────────────────────────────────

interface FeedbacksTableProps {
  type: FeedbackType
  facilityId: string
  startDate: string
  endDate: string
}

function FeedbacksTable({ type, facilityId, startDate, endDate }: FeedbacksTableProps) {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | ''>('')
  // PERF: reset page when filters change
  useEffect(() => { setPage(1) }, [type, facilityId, startDate, endDate, statusFilter])
  const [viewingFeedback, setViewingFeedback] = useState<Feedback | null>(null)
  const [deletingFeedback, setDeletingFeedback] = useState<Feedback | null>(null)

  const filters: FeedbacksFilters = {
    page,
    limit: 15,
    type,
    status: statusFilter,
    facilityId: facilityId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  }

  const { data, isLoading, isError } = useFeedbacks(filters)
  const updateStatus = useUpdateFeedbackStatus()
  const deleteFeedback = useDeleteFeedback()

  const feedbacks = data?.data ?? []
  const meta = data?.meta

  const handleApprove = (fb: Feedback) =>
    updateStatus.mutate({ id: fb.id, status: 'approved' })
  const handleReject = (fb: Feedback) =>
    updateStatus.mutate({ id: fb.id, status: 'rejected' })
  const handleDelete = async () => {
    if (!deletingFeedback) return
    await deleteFeedback.mutateAsync(deletingFeedback.id)
    setDeletingFeedback(null)
  }

  return (
    <>
      {/* Status filter */}
      <div className="mb-3 flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as FeedbackStatus | '')
            setPage(1)
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Từ chối</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Người gửi
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Cơ sở
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Trạng thái
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Nguồn
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Survey Key
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Thời gian
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
            {!isLoading && !isError && feedbacks.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-gray-500">
                  Chưa có phản hồi nào.
                </td>
              </tr>
            )}
            {feedbacks.map((fb) => (
              <tr key={fb.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 text-sm font-medium text-gray-900">
                  {fb.creator?.fullName ?? 'Ẩn danh'}
                </td>
                <td className="px-5 py-3 text-sm text-gray-500">{fb.facilityId ?? '—'}</td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[fb.status]}`}
                  >
                    {STATUS_LABELS[fb.status]}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SOURCE_CLASSES[fb.source]}`}
                  >
                    {SOURCE_LABELS[fb.source]}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm text-gray-500">{fb.surveyKey ?? '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-500">{formatDate(fb.createdAt)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setViewingFeedback(fb)}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                      title="Xem chi tiết"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {fb.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(fb)}
                          disabled={updateStatus.isPending}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600"
                          title="Duyệt"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReject(fb)}
                          disabled={updateStatus.isPending}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Từ chối"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setDeletingFeedback(fb)}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="Xoá"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
              {Math.min(meta.page * meta.limit, meta.total)} / {meta.total} phản hồi
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={meta.page <= 1}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                ← Trước
              </button>
              {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => {
                const p = i + 1
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                      meta.page === p
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage((p) => p + 1)}
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
      <DetailDialog feedback={viewingFeedback} onClose={() => setViewingFeedback(null)} />
      <DeleteConfirmDialog
        feedback={deletingFeedback}
        isDeleting={deleteFeedback.isPending}
        onClose={() => setDeletingFeedback(null)}
        onConfirm={handleDelete}
      />
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FeedbacksPage() {
  const canSeeReflect = useHasAnyPermission(['reflect.list_feedback'])
  const canSeeEvaluate = useHasAnyPermission(['evaluate.list_feedback'])

  // Default to first permitted tab
  const defaultTab: FeedbackType = canSeeReflect ? 'reflect' : 'evaluate'
  const [activeTab, setActiveTab] = useState<FeedbackType>(defaultTab)
  const [facilityId, setFacilityId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const tabItems: { key: FeedbackType; label: string; icon: React.ReactNode; allowed: boolean }[] =
    [
      {
        key: 'reflect',
        label: 'Phản ánh',
        icon: <MessageSquare className="h-4 w-4" />,
        allowed: canSeeReflect,
      },
      {
        key: 'evaluate',
        label: 'Đánh giá',
        icon: <Star className="h-4 w-4" />,
        allowed: canSeeEvaluate,
      },
    ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Phản hồi &amp; Đánh giá</h1>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý phản ánh của người dân và đánh giá chất lượng dịch vụ
        </p>
      </div>

      {/* Shared filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={facilityId}
          onChange={(e) => setFacilityId(e.target.value)}
          placeholder="Lọc theo cơ sở..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        {(facilityId || startDate || endDate) && (
          <button
            onClick={() => {
              setFacilityId('')
              setStartDate('')
              setEndDate('')
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Stats */}
      <StatsCards
        type={activeTab}
        facilityId={facilityId}
        startDate={startDate}
        endDate={endDate}
      />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabItems
            .filter((t) => t.allowed)
            .map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`inline-flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${
                  activeTab === t.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
        </nav>
      </div>

      {/* Table */}
      {(activeTab === 'reflect' && canSeeReflect) ||
      (activeTab === 'evaluate' && canSeeEvaluate) ? (
        <FeedbacksTable
          key={activeTab} /* PERF FIX RESTORED: key required so page resets to 1 when switching tabs */
          type={activeTab}
          facilityId={facilityId}
          startDate={startDate}
          endDate={endDate}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-sm text-gray-500">Bạn không có quyền xem mục này.</p>
        </div>
      )}
    </div>
  )
}
