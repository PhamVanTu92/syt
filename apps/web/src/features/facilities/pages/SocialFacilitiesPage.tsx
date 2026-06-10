import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Pencil, Trash2, Plus, Search, Building2, Users } from 'lucide-react'
import {
  useSocialFacilities,
  useCreateSocialFacility,
  useUpdateSocialFacility,
  useDeleteSocialFacility,
  type SocialFacility,
  type FacilityStatus,
  type SocialFacilitiesFilters,
} from '../api/facilities.queries'
import { usePermission } from '@/hooks/use-permission'

// ─── Zod schema ───────────────────────────────────────────────────────────────

const socialFacilitySchema = z.object({
  name: z.string().min(3, 'Tên cơ sở ít nhất 3 ký tự'),
  code: z.string().min(2, 'Mã cơ sở ít nhất 2 ký tự'),
  facilityType: z.string().min(1, 'Vui lòng chọn loại cơ sở'),
  status: z.enum(['active', 'inactive', 'pending', 'suspended'] as const),
  address: z.string().optional(),
  district: z.string().optional(),
  phone: z.string().optional(),
  managerName: z.string().optional(),
  capacity: z.coerce.number().min(0).optional(),
  currentOccupancy: z.coerce.number().min(0).optional(),
  targetGroup: z.string().optional(),
  licenseNumber: z.string().optional(),
})

type SocialFacilityFormValues = z.infer<typeof socialFacilitySchema>

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<FacilityStatus, string> = {
  active: 'Hoạt động',
  inactive: 'Ngừng hoạt động',
  pending: 'Chờ duyệt',
  suspended: 'Tạm đình chỉ',
}

const STATUS_CLASSES: Record<FacilityStatus, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-red-100 text-red-700',
}

const FACILITY_TYPE_LABELS: Record<string, string> = {
  nursing_home: 'Nhà dưỡng lão',
  orphanage: 'Trung tâm nuôi dưỡng trẻ em',
  disability_center: 'Trung tâm người khuyết tật',
  mental_health: 'Cơ sở tâm thần',
  rehabilitation: 'Trung tâm phục hồi chức năng',
  detox_center: 'Trung tâm cai nghiện',
  other: 'Khác',
}

const HANOI_DISTRICTS = [
  'Ba Đình', 'Hoàn Kiếm', 'Hai Bà Trưng', 'Đống Đa', 'Tây Hồ',
  'Cầu Giấy', 'Thanh Xuân', 'Hoàng Mai', 'Long Biên', 'Hà Đông',
  'Bắc Từ Liêm', 'Nam Từ Liêm', 'Sóc Sơn', 'Đông Anh', 'Gia Lâm',
  'Thanh Trì', 'Thường Tín', 'Phú Xuyên', 'Ứng Hòa', 'Mỹ Đức',
  'Thanh Oai', 'Chương Mỹ', 'Đan Phượng', 'Hoài Đức', 'Quốc Oai',
  'Thạch Thất', 'Ba Vì', 'Phúc Thọ', 'Mê Linh', 'Sơn Tây',
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: FacilityStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

// ─── Form Dialog ──────────────────────────────────────────────────────────────

interface FacilityFormDialogProps {
  open: boolean
  editing: SocialFacility | null
  onClose: () => void
}

function FacilityFormDialog({ open, editing, onClose }: FacilityFormDialogProps) {
  const createFacility = useCreateSocialFacility()
  const updateFacility = useUpdateSocialFacility()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SocialFacilityFormValues>({
    resolver: zodResolver(socialFacilitySchema),
    defaultValues: editing
      ? {
          name: editing.name,
          code: editing.code,
          facilityType: editing.facilityType,
          status: editing.status,
          address: editing.address ?? '',
          district: editing.district ?? '',
          phone: editing.phone ?? '',
          managerName: editing.managerName ?? '',
          capacity: editing.capacity ?? undefined,
          currentOccupancy: editing.currentOccupancy ?? undefined,
          targetGroup: editing.targetGroup ?? '',
          licenseNumber: editing.licenseNumber ?? '',
        }
      : { status: 'active' as const },
  })

  const onSubmit = async (values: SocialFacilityFormValues) => {
    try {
      if (editing) {
        await updateFacility.mutateAsync({ id: editing.id, data: values })
      } else {
        await createFacility.mutateAsync(values)
      }
      reset()
      onClose()
    } catch {
      // handled
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? 'Chỉnh sửa cơ sở xã hội' : 'Thêm cơ sở xã hội'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-5">
          {/* Name + Code */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tên cơ sở <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Nhập tên cơ sở xã hội"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Mã cơ sở <span className="text-red-500">*</span>
              </label>
              <input
                {...register('code')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Vd: XH001"
              />
              {errors.code && (
                <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Loại cơ sở <span className="text-red-500">*</span>
              </label>
              <select
                {...register('facilityType')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="">-- Chọn loại --</option>
                {Object.entries(FACILITY_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.facilityType && (
                <p className="mt-1 text-xs text-red-500">{errors.facilityType.message}</p>
              )}
            </div>
          </div>

          {/* Status + District */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Trạng thái</label>
              <select
                {...register('status')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="active">Hoạt động</option>
                <option value="inactive">Ngừng hoạt động</option>
                <option value="pending">Chờ duyệt</option>
                <option value="suspended">Tạm đình chỉ</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Quận/Huyện</label>
              <select
                {...register('district')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="">-- Chọn quận/huyện --</option>
                {HANOI_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Địa chỉ</label>
            <input
              {...register('address')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="Số nhà, tên đường, phường/xã"
            />
          </div>

          {/* Phone + Manager */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Số điện thoại
              </label>
              <input
                {...register('phone')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="024..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Người phụ trách
              </label>
              <input
                {...register('managerName')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="Họ tên người phụ trách"
              />
            </div>
          </div>

          {/* Capacity + Occupancy */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Năng lực tiếp nhận
              </label>
              <input
                {...register('capacity')}
                type="number"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Đang nuôi dưỡng
              </label>
              <input
                {...register('currentOccupancy')}
                type="number"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          {/* Target Group */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Đối tượng phục vụ
            </label>
            <input
              {...register('targetGroup')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="Vd: Người cao tuổi, trẻ em mồ côi..."
            />
          </div>

          {/* License */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Số giấy phép</label>
            <input
              {...register('licenseNumber')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="Số giấy phép hoạt động"
            />
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
              {isSubmitting ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Thêm cơ sở'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

interface DeleteConfirmProps {
  facility: SocialFacility | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

function DeleteConfirmDialog({ facility, isDeleting, onClose, onConfirm }: DeleteConfirmProps) {
  if (!facility) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="px-6 py-5">
          <h3 className="text-base font-semibold text-gray-900">Xác nhận xoá</h3>
          <p className="mt-2 text-sm text-gray-600">
            Bạn có chắc muốn xoá cơ sở{' '}
            <span className="font-medium text-gray-900">"{facility.name}"</span>? Hành động này
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

export default function SocialFacilitiesPage() {
  const canCreate = usePermission('facilities.create')
  const canDelete = usePermission('facilities.delete')

  const [filters, setFilters] = useState<SocialFacilitiesFilters>({
    page: 1,
    limit: 15,
    search: '',
    status: '',
    district: '',
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFacility, setEditingFacility] = useState<SocialFacility | null>(null)
  const [deletingFacility, setDeletingFacility] = useState<SocialFacility | null>(null)

  const { data, isLoading, isError } = useSocialFacilities(filters)
  const deleteFacility = useDeleteSocialFacility()

  const facilities = data?.data ?? []
  const meta = data?.meta

  const updateFilter = (patch: Partial<SocialFacilitiesFilters>) =>
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }))

  const handleDelete = async () => {
    if (!deletingFacility) return
    await deleteFacility.mutateAsync(deletingFacility.id)
    setDeletingFacility(null)
  }

  const openCreate = () => {
    setEditingFacility(null)
    setDialogOpen(true)
  }

  const openEdit = (facility: SocialFacility) => {
    setEditingFacility(facility)
    setDialogOpen(true)
  }

  // Summary stats
  const totalCapacity = facilities.reduce((sum, f) => sum + (f.capacity ?? 0), 0)
  const totalOccupancy = facilities.reduce((sum, f) => sum + (f.currentOccupancy ?? 0), 0)
  const activeCount = facilities.filter((f) => f.status === 'active').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Cơ sở bảo trợ xã hội</h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý danh sách và thông tin các cơ sở bảo trợ xã hội trên địa bàn Hà Nội
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Thêm cơ sở
          </button>
        )}
      </div>

      {/* Stats cards */}
      {meta && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Tổng cơ sở
                </p>
                <p className="text-2xl font-semibold text-gray-900">{meta.total}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Đang hoạt động
                </p>
                <p className="text-2xl font-semibold text-gray-900">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Đang nuôi dưỡng
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {totalOccupancy.toLocaleString('vi')}
                  {totalCapacity > 0 && (
                    <span className="text-sm font-normal text-gray-500">
                      /{totalCapacity.toLocaleString('vi')}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={filters.search}
            onChange={(e) => updateFilter({ search: e.target.value })}
            placeholder="Tìm theo tên hoặc mã cơ sở..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={filters.status ?? ''}
          onChange={(e) => updateFilter({ status: e.target.value as FacilityStatus | '' })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Ngừng hoạt động</option>
          <option value="pending">Chờ duyệt</option>
          <option value="suspended">Tạm đình chỉ</option>
        </select>
        <select
          value={filters.district ?? ''}
          onChange={(e) => updateFilter({ district: e.target.value })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Tất cả quận/huyện</option>
          {HANOI_DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tên cơ sở
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Loại
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Trạng thái
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Quận/Huyện
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Người phụ trách
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Công suất
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
                <td colSpan={8} className="py-12 text-center text-sm text-gray-500">
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-red-500">
                  Không thể tải dữ liệu. Vui lòng thử lại.
                </td>
              </tr>
            )}
            {!isLoading && !isError && facilities.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-gray-500">
                  Chưa có cơ sở nào trong hệ thống.
                </td>
              </tr>
            )}
            {facilities.map((facility) => (
              <tr key={facility.id} className="hover:bg-gray-50">
                <td className="max-w-xs px-5 py-3">
                  <div>
                    <p className="truncate text-sm font-medium text-gray-900">{facility.name}</p>
                    <p className="text-xs text-gray-500">{facility.code}</p>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-gray-600">
                  {FACILITY_TYPE_LABELS[facility.facilityType] ?? facility.facilityType}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={facility.status} />
                </td>
                <td className="px-5 py-3 text-sm text-gray-600">{facility.district ?? '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-600">
                  {facility.managerName ?? '—'}
                </td>
                <td className="px-5 py-3 text-sm text-gray-600">
                  {facility.capacity != null ? (
                    <span>
                      <span
                        className={
                          (facility.currentOccupancy ?? 0) > (facility.capacity ?? 0)
                            ? 'text-red-600 font-medium'
                            : ''
                        }
                      >
                        {facility.currentOccupancy ?? 0}
                      </span>
                      /{facility.capacity}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-5 py-3 text-sm text-gray-500">
                  {format(new Date(facility.createdAt), 'dd/MM/yyyy', { locale: vi })}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(facility)}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                      title="Chỉnh sửa"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => setDeletingFacility(facility)}
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
              {Math.min(meta.page * meta.limit, meta.total)} / {meta.total} cơ sở
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
      <FacilityFormDialog
        open={dialogOpen}
        editing={editingFacility}
        onClose={() => {
          setDialogOpen(false)
          setEditingFacility(null)
        }}
      />
      <DeleteConfirmDialog
        facility={deletingFacility}
        isDeleting={deleteFacility.isPending}
        onClose={() => setDeletingFacility(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
