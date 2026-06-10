import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Shield,
  FileText,
  Building2,
  Calendar,
  MessageSquare,
  BarChart3,
  Image,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useUIStore } from '@/store/ui.store'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'

interface MenuItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
}

const menuItems: MenuItem[] = [
  { label: 'Tin tức', path: '/admin/dashboard', icon: LayoutDashboard, permission: 'posts' },
  { label: 'Người dùng', path: '/admin/users', icon: Users, permission: 'users' },
  { label: 'Vai trò', path: '/admin/roles', icon: Shield, permission: 'roles' },
  { label: 'Lịch công tác', path: '/admin/schedules', icon: Calendar, permission: 'work_schedule' },
  { label: 'Cơ sở y tế', path: '/admin/social-facilities', icon: Building2, permission: 'social_facilities' },
  { label: 'Biểu mẫu', path: '/admin/templates/reflect', icon: FileText, permission: 'reflect.form' },
  { label: 'Phản hồi', path: '/admin/feedbacks/reflect', icon: MessageSquare, permission: 'reflect.list_feedback' },
  { label: 'Báo cáo', path: '/admin/report/DCBC', icon: BarChart3, permission: 'report' },
  { label: 'Banner', path: '/admin/banners', icon: Image, permission: 'banners' },
  { label: 'Cài đặt', path: '/admin/smtp', icon: Settings, permission: 'smtp' },
]

export default function AdminSidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  // LOW FIX: use selector to avoid re-render when unrelated store fields change
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const superAdmin = isSuperAdmin()

  const visibleItems = menuItems.filter(
    (item) => !item.permission || superAdmin || hasPermission(item.permission),
  )

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-full flex-col bg-primary text-primary-foreground transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        {sidebarOpen && (
          <span className="truncate text-sm font-semibold">Sở Y Tế Hà Nội</span>
        )}
        <button onClick={toggleSidebar} className="rounded p-1 hover:bg-white/10">
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/10',
                isActive && 'bg-white/20 font-medium',
                !sidebarOpen && 'justify-center px-0',
              )
            }
            title={!sidebarOpen ? item.label : undefined}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
