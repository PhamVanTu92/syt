import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'

// ─── New Layouts ──────────────────────────────────────────────────────────────
const PublicLayout = lazy(() => import('@/components/layout/PublicLayout'))

// ─── Legacy Admin Route guard (renders Outlet; each page provides its own AdminLayout) ──
const LegacyAdminRoute = lazy(() => import('@/components/legacy/AdminRoute'))

// ─── Auth pages (legacy) ─────────────────────────────────────────────────────
const Login            = lazy(() => import('@/pages/Login'))
const ForgotPassword   = lazy(() => import('@/pages/ForgotPassword'))
const ConfirmPassword  = lazy(() => import('@/pages/ConfirmPassword'))
const ChangePassword   = lazy(() => import('@/pages/ChangePassword'))

// ─── Admin pages (legacy) ────────────────────────────────────────────────────
const AdminDashboard             = lazy(() => import('@/pages/AdminDashboard'))
const UserManagement             = lazy(() => import('@/pages/UserManagement'))
const RolesManagement            = lazy(() => import('@/pages/RolesManagement'))
const PermissionsManagement      = lazy(() => import('@/pages/PermissionsManagement'))
const BannersManagement          = lazy(() => import('@/pages/BannersManagement'))
const AdminWorkSchedule          = lazy(() => import('@/pages/AdminWorkSchedule'))
const TemplatesManagement        = lazy(() => import('@/pages/TemplatesManagement'))
const TemplateCreate             = lazy(() => import('@/pages/TemplateCreate'))
const TemplateQrView             = lazy(() => import('@/pages/TemplateQrView'))
const FeedbacksManagement        = lazy(() => import('@/pages/FeedbacksManagement'))
const SurveysManagement          = lazy(() => import('@/pages/SurveysManagement'))
const SocialFacilitiesManagement = lazy(() => import('@/pages/SocialFacilitiesManagement'))
const AffiliatedFacilitiesManagement = lazy(() => import('@/pages/AffiliatedFacilitiesManagement'))
const TradingFacilitiesManagement = lazy(() => import('@/pages/TradingFacilitiesManagement'))
const SmtpSettings               = lazy(() => import('@/pages/SmtpSettings'))
const Report_DCBC                = lazy(() => import('@/pages/Report_DCBC'))
const Report_KSHL                = lazy(() => import('@/pages/Report_KSHL'))
const Report_TCT01               = lazy(() => import('@/pages/Report_TCT01'))

// ─── Public pages (legacy) ───────────────────────────────────────────────────
const Home               = lazy(() => import('@/pages/Home'))
const NewsCategory       = lazy(() => import('@/pages/NewsCategory'))
const NewsDetail         = lazy(() => import('@/pages/NewsDetail'))
const FormList           = lazy(() => import('@/pages/FormList'))
const FormDetail         = lazy(() => import('@/pages/FormDetail'))
const DataLookup         = lazy(() => import('@/pages/DataLookup'))
const HanoiSystem        = lazy(() => import('@/pages/HanoiSystem'))
const HealthConsultation = lazy(() => import('@/pages/HealthConsultation'))
const EmergencyCenter    = lazy(() => import('@/pages/EmergencyCenter'))

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
  { path: '/login',            element: <S><Login /></S> },
  { path: '/forgot-password',  element: <S><ForgotPassword /></S> },
  { path: '/confirm-password', element: <S><ConfirmPassword /></S> },
  { path: '/change-password',  element: <S><ChangePassword /></S> },

  // ── Admin (protected, legacy AdminRoute which renders Outlet) ───────────────
  {
    path: '/admin',
    element: <S><LegacyAdminRoute /></S>,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },

      // Dashboard
      { path: 'dashboard',   element: <S><AdminDashboard /></S> },

      // Users & RBAC
      { path: 'users',       element: <S><UserManagement /></S> },
      { path: 'roles',       element: <S><RolesManagement /></S> },
      { path: 'permissions', element: <S><PermissionsManagement /></S> },

      // Content
      { path: 'posts',       element: <S><AdminDashboard /></S> },
      { path: 'banners',     element: <S><BannersManagement /></S> },

      // Schedules
      { path: 'schedules',   element: <S><AdminWorkSchedule /></S> },

      // Templates
      { path: 'templates',          element: <S><TemplatesManagement /></S> },
      { path: 'templates/create',   element: <S><TemplateCreate /></S> },
      { path: 'templates/:id/qr',   element: <S><TemplateQrView /></S> },

      // Feedbacks & Surveys
      { path: 'feedbacks/reflect',  element: <S><FeedbacksManagement /></S> },
      { path: 'feedbacks/evaluate', element: <S><FeedbacksManagement /></S> },
      { path: 'surveys',            element: <S><SurveysManagement /></S> },

      // Facilities
      { path: 'facilities/social',     element: <S><SocialFacilitiesManagement /></S> },
      { path: 'facilities/affiliated', element: <S><AffiliatedFacilitiesManagement /></S> },
      { path: 'facilities/trading',    element: <S><TradingFacilitiesManagement /></S> },

      // Reports
      { path: 'reports/dcbc',  element: <S><Report_DCBC /></S> },
      { path: 'reports/kshl',  element: <S><Report_KSHL /></S> },
      { path: 'reports/tct01', element: <S><Report_TCT01 /></S> },

      // Settings
      { path: 'smtp', element: <S><SmtpSettings /></S> },
    ],
  },

  // ── Public (PublicLayout with legacy pages) ───────────────────────────────
  {
    path: '/',
    element: <S><PublicLayout /></S>,
    children: [
      { index: true,                  element: <S><Home /></S> },
      { path: 'tin-tuc',              element: <S><NewsCategory /></S> },
      { path: 'tin-tuc/:id',          element: <S><NewsDetail /></S> },
      { path: 'form-danh-gia',        element: <S><FormList /></S> },
      { path: 'form-danh-gia/:id',    element: <S><FormDetail /></S> },
      { path: 'tra-cuu',              element: <S><DataLookup /></S> },
      { path: 'he-thong-ha-noi',      element: <S><HanoiSystem /></S> },
      { path: 'tu-van-suc-khoe',      element: <S><HealthConsultation /></S> },
      { path: 'cap-cuu',              element: <S><EmergencyCenter /></S> },
    ],
  },

  // ── Catch-all ────────────────────────────────────────────────────────────
  { path: '*', element: <Navigate to="/" replace /> },
])
