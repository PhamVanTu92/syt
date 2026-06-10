import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'

// ─── Layouts ─────────────────────────────────────────────────────────────────
const PublicLayout = lazy(() => import('@/components/layout/PublicLayout'))
const AdminLayout  = lazy(() => import('@/components/layout/AdminLayout'))

// ─── Auth pages ───────────────────────────────────────────────────────────────
const LoginPage          = lazy(() => import('@/features/auth/pages/LoginPage'))
const RegisterPage       = lazy(() => import('@/features/auth/pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'))

// ─── Admin — Content ─────────────────────────────────────────────────────────
const DashboardPage = lazy(() => import('@/features/posts/pages/DashboardPage'))

// ─── Admin — Users & Roles ───────────────────────────────────────────────────
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage'))
const RolesPage = lazy(() => import('@/features/users/pages/RolesPage'))

// ─── Admin — Facilities ──────────────────────────────────────────────────────
const SocialFacilitiesPage   = lazy(() => import('@/features/facilities/pages/SocialFacilitiesPage'))

// ─── Admin — Schedules ───────────────────────────────────────────────────────
const SchedulesPage = lazy(() => import('@/features/schedules/pages/SchedulesPage'))

// ─── Admin — Forms & Feedbacks ───────────────────────────────────────────────
const FormsPage     = lazy(() => import('@/features/forms/pages/FormsPage'))
const FeedbacksPage = lazy(() => import('@/features/feedbacks/pages/FeedbacksPage'))

// ─── Route guard ─────────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

// ─── Router ──────────────────────────────────────────────────────────────────
export const router = createBrowserRouter([
  // ── Auth (no layout) ──────────────────────────────────────────────────────
  { path: '/login',           element: <S><LoginPage /></S> },
  { path: '/register',        element: <S><RegisterPage /></S> },
  { path: '/forgot-password', element: <S><ForgotPasswordPage /></S> },

  // ── Admin (protected, AdminLayout) ────────────────────────────────────────
  {
    path: '/admin',
    element: (
      <RequireAuth>
        <S><AdminLayout /></S>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },

      // Content
      { path: 'dashboard', element: <S><DashboardPage /></S> },

      // Users & RBAC
      { path: 'users',    element: <S><UsersPage /></S> },
      { path: 'roles',    element: <S><RolesPage /></S> },

      // Facilities
      { path: 'social-facilities',    element: <S><SocialFacilitiesPage /></S> },

      // Schedules
      { path: 'schedules', element: <S><SchedulesPage /></S> },

      // Forms & Feedback
      { path: 'templates/reflect',  element: <S><FormsPage /></S> },
      { path: 'templates/evaluate', element: <S><FormsPage /></S> },
      { path: 'feedbacks/reflect',  element: <S><FeedbacksPage /></S> },
      { path: 'feedbacks/evaluate', element: <S><FeedbacksPage /></S> },
    ],
  },

  // ── Public (PublicLayout) ─────────────────────────────────────────────────
  {
    path: '/',
    element: <S><PublicLayout /></S>,
    children: [
      { index: true, element: <div className="container mx-auto px-4 py-12 text-center"><h1 className="text-3xl font-bold text-primary">Sở Y Tế Hà Nội</h1><p className="mt-4 text-muted-foreground">Cổng thông tin điện tử</p></div> },
    ],
  },

  // ── Catch-all ────────────────────────────────────────────────────────────
  { path: '*', element: <Navigate to="/" replace /> },
])
