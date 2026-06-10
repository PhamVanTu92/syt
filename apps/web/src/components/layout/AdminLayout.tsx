import { Outlet } from 'react-router-dom'
import { useUIStore } from '@/store/ui.store'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import AdminSidebar from './AdminSidebar'
import AdminHeader from './AdminHeader'

export default function AdminLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-300',
          sidebarOpen ? 'ml-64' : 'ml-16',
        )}
      >
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
