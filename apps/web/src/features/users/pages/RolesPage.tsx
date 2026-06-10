import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useAssignPermissionsToRole,
  usePermissions,
  type Role,
  type Permission,
} from '@/features/roles/api/roles.queries'
import { usePermission } from '@/hooks/use-permission'

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const roleSchema = z.object({
  name: z.string().min(2, 'Tên vai trò ít nhất 2 ký tự'),
  description: z.string().optional(),
})

type RoleFormValues = z.infer<typeof roleSchema>

// ─── Create / Edit Role Dialog ────────────────────────────────────────────────

interface RoleDialogProps {
  role: Role | null
  onClose: () => void
}

function RoleDialog({ role, onClose }: RoleDialogProps) {
  const isEdit = role !== null
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: isEdit
      ? { name: role.name, description: role.description ?? '' }
      : { name: '', description: '' },
  })

  const onSubmit = async (values: RoleFormValues) => {
    try {
      if (isEdit) {
        await updateRole.mutateAsync({ id: role.id, data: values })
      } else {
        await createRole.mutateAsync(values)
        reset()
      }
      onClose()
    } catch {
      // handled
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Chỉnh sửa vai trò' : 'Tạo vai trò mới'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tên vai trò <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Ví dụ: Biên tập viên"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Mô tả ngắn về vai trò..."
            />
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
              {isSubmitting ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo vai trò'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Assign Permissions Dialog ────────────────────────────────────────────────

interface AssignPermissionsDialogProps {
  role: Role
  onClose: () => void
}

// NOTE: groupPermissionsByParent is available for future grouped-view UI
export function groupPermissionsByParent(permissions: Permission[]): Map<string, Permission[]> {
  const grouped = new Map<string, Permission[]>()
  for (const perm of permissions) {
    const parent = perm.parentKey ?? '_root'
    if (!grouped.has(parent)) grouped.set(parent, [])
    grouped.get(parent)!.push(perm)
  }
  return grouped
}

function AssignPermissionsDialog({ role, onClose }: AssignPermissionsDialogProps) {
  const { data: permsData, isLoading } = usePermissions()
  const assignPermissions = useAssignPermissionsToRole()

  const allPermissions = permsData?.data ?? []
  const currentIds = new Set(role.permissions.map((p) => p.id))
  const [selected, setSelected] = useState<Set<number>>(new Set(currentIds))

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    try {
      await assignPermissions.mutateAsync({
        id: role.id,
        permissionIds: Array.from(selected),
      })
      onClose()
    } catch {
      // handled
    }
  }

  // Build a grouped view: top-level parents first, then children beneath them
  const topLevel = allPermissions.filter((p) => !p.parentKey)
  const childrenOf = (key: string) => allPermissions.filter((p) => p.parentKey === key)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Phân quyền vai trò</h2>
            <p className="text-sm text-gray-500">
              Vai trò: <span className="font-medium text-gray-800">{role.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {isLoading && (
            <p className="py-8 text-center text-sm text-gray-500">Đang tải quyền...</p>
          )}
          {!isLoading && topLevel.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">Không có quyền nào.</p>
          )}
          {topLevel.map((parent) => {
            const children = childrenOf(parent.key)
            return (
              <div key={parent.id} className="mb-4">
                {/* Parent permission */}
                <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selected.has(parent.id)}
                    onChange={() => toggle(parent.id)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{parent.name}</p>
                    {parent.description && (
                      <p className="text-xs text-gray-500">{parent.description}</p>
                    )}
                    <p className="text-xs text-gray-400">{parent.key}</p>
                  </div>
                </label>

                {/* Child permissions */}
                {children.length > 0 && (
                  <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-100 pl-4">
                    {children.map((child) => (
                      <label
                        key={child.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(child.id)}
                          onChange={() => toggle(child.id)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-sm text-gray-700">{child.name}</p>
                          {child.description && (
                            <p className="text-xs text-gray-500">{child.description}</p>
                          )}
                          <p className="text-xs text-gray-400">{child.key}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4">
          <p className="text-sm text-gray-500">
            Đã chọn <span className="font-medium text-blue-600">{selected.size}</span> quyền
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={assignPermissions.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {assignPermissions.isPending ? 'Đang lưu...' : 'Lưu phân quyền'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

interface DeleteConfirmProps {
  role: Role | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

function DeleteConfirmDialog({ role, isDeleting, onClose, onConfirm }: DeleteConfirmProps) {
  if (!role) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="px-6 py-5">
          <h3 className="text-base font-semibold text-gray-900">Xác nhận xoá vai trò</h3>
          <p className="mt-2 text-sm text-gray-600">
            Bạn có chắc muốn xoá vai trò{' '}
            <span className="font-medium text-gray-900">{role.name}</span>? Hành động này không
            thể hoàn tác.
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

export default function RolesPage() {
  const canManage = usePermission('roles')

  const [createOpen, setCreateOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [assigningRole, setAssigningRole] = useState<Role | null>(null)
  const [deletingRole, setDeletingRole] = useState<Role | null>(null)

  const { data, isLoading, isError } = useRoles()
  const deleteRole = useDeleteRole()

  const roles = data?.data ?? []

  const handleDelete = async () => {
    if (!deletingRole) return
    await deleteRole.mutateAsync(deletingRole.id)
    setDeletingRole(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Quản lý vai trò</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tạo và phân quyền cho các vai trò trong hệ thống
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Tạo vai trò
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tên vai trò
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Mô tả
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Số quyền
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-sm text-gray-500">
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-sm text-red-500">
                  Không thể tải dữ liệu. Vui lòng thử lại.
                </td>
              </tr>
            )}
            {!isLoading && !isError && roles.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-sm text-gray-500">
                  Chưa có vai trò nào.
                </td>
              </tr>
            )}
            {roles.map((role) => (
              <tr key={role.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-700">
                      {role.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{role.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-gray-500">
                  {role.description ?? '—'}
                </td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {role._count?.permissions ?? role.permissions.length} quyền
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {canManage && (
                      <>
                        <button
                          onClick={() => setEditingRole(role)}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                          title="Chỉnh sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setAssigningRole(role)}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-purple-50 hover:text-purple-600"
                          title="Phân quyền"
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingRole(role)}
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
      </div>

      {/* Dialogs */}
      {createOpen && <RoleDialog role={null} onClose={() => setCreateOpen(false)} />}
      {editingRole && (
        <RoleDialog role={editingRole} onClose={() => setEditingRole(null)} />
      )}
      {assigningRole && (
        <AssignPermissionsDialog role={assigningRole} onClose={() => setAssigningRole(null)} />
      )}
      <DeleteConfirmDialog
        role={deletingRole}
        isDeleting={deleteRole.isPending}
        onClose={() => setDeletingRole(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
