import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

// ─── Layouts ──────────────────────────────────────────────────────────────────
const PublicLayout = lazy(() => import('@/components/layout/PublicLayout'))
const LegacyAdminRoute = lazy(() => import('@/components/legacy/AdminRoute'))

// ─── Auth pages ───────────────────────────────────────────────────────────────
const Login            = lazy(() => import('@/pages/Login'))
const ForgotPassword   = lazy(() => import('@/pages/ForgotPassword'))
const ConfirmPassword  = lazy(() => import('@/pages/ConfirmPassword'))
const ChangePassword   = lazy(() => import('@/pages/ChangePassword'))
const Register         = lazy(() => import('@/pages/Register'))

// ─── Admin pages ──────────────────────────────────────────────────────────────
const AdminDashboard                 = lazy(() => import('@/pages/AdminDashboard'))
const UserManagement                 = lazy(() => import('@/pages/UserManagement'))
const RolesManagement                = lazy(() => import('@/pages/RolesManagement'))
const PermissionsManagement          = lazy(() => import('@/pages/PermissionsManagement'))
const BannersManagement              = lazy(() => import('@/pages/BannersManagement'))
const AdminWorkSchedule              = lazy(() => import('@/pages/AdminWorkSchedule'))
const TemplatesManagement            = lazy(() => import('@/pages/TemplatesManagement'))
const TemplateCreate                 = lazy(() => import('@/pages/TemplateCreate'))
const TemplateQrView                 = lazy(() => import('@/pages/TemplateQrView'))
const FeedbacksManagement            = lazy(() => import('@/pages/FeedbacksManagement'))
const SurveysManagement              = lazy(() => import('@/pages/SurveysManagement'))
const SocialFacilitiesManagement     = lazy(() => import('@/pages/SocialFacilitiesManagement'))
const AffiliatedFacilitiesManagement = lazy(() => import('@/pages/AffiliatedFacilitiesManagement'))
const TradingFacilitiesManagement    = lazy(() => import('@/pages/TradingFacilitiesManagement'))
const SmtpSettings                   = lazy(() => import('@/pages/SmtpSettings'))
const Report_DCBC                    = lazy(() => import('@/pages/report/Report_DCBC'))
const Report_KSHL                    = lazy(() => import('@/pages/report/Report_KSHL'))
const Report_TCT01                   = lazy(() => import('@/pages/report/Report_TCT01'))

// ─── Public pages ─────────────────────────────────────────────────────────────
const Home                  = lazy(() => import('@/pages/Home'))
const NewsCategory          = lazy(() => import('@/pages/NewsCategory'))
const NewsDetail            = lazy(() => import('@/pages/NewsDetail'))
const FormList              = lazy(() => import('@/pages/FormList'))
const FormDetail            = lazy(() => import('@/pages/FormDetail'))
const DataLookup            = lazy(() => import('@/pages/DataLookup'))
const HanoiSystem           = lazy(() => import('@/pages/HanoiSystem'))
const HealthConsultation    = lazy(() => import('@/pages/HealthConsultation'))
const EmergencyCenter       = lazy(() => import('@/pages/EmergencyCenter'))
const DigitalTransformation = lazy(() => import('@/pages/DigitalTransformation'))
const PolicyHealthInsurance = lazy(() => import('@/pages/PolicyHealthInsurance'))
const WorkSchedule          = lazy(() => import('@/pages/WorkSchedule'))

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

// External redirect helper
function ExternalRedirect({ to }: { to: string }) {
  window.location.replace(to)
  return null
}

export const router = createBrowserRouter([
  // ── Auth (no layout) ───────────────────────────────────────────────────────
  { path: '/login',            element: <S><Login /></S> },
  { path: '/register',         element: <S><Register /></S> },
  { path: '/forgot-password',  element: <S><ForgotPassword /></S> },
  { path: '/confirm-password', element: <S><ConfirmPassword /></S> },
  { path: '/change-password',  element: <S><ChangePassword /></S> },

  // ── QR public (no layout) ─────────────────────────────────────────────────
  { path: '/templates/qr/:id', element: <S><TemplateQrView /></S> },

  // ── Admin (protected) ─────────────────────────────────────────────────────
  {
    path: '/admin',
    element: <S><LegacyAdminRoute /></S>,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },

      { path: 'dashboard',   element: <S><AdminDashboard /></S> },

      { path: 'users',       element: <S><UserManagement /></S> },
      { path: 'roles',       element: <S><RolesManagement /></S> },
      { path: 'permissions', element: <S><PermissionsManagement /></S> },

      { path: 'banners',     element: <S><BannersManagement /></S> },
      { path: 'schedules',   element: <S><AdminWorkSchedule /></S> },

      // Templates (with optional type and create/edit)
      { path: 'templates',              element: <S><TemplatesManagement /></S> },
      { path: 'templates/:type',        element: <S><TemplatesManagement /></S> },
      { path: 'templates/create',       element: <S><TemplateCreate /></S> },
      { path: 'templates/create/:type', element: <S><TemplateCreate /></S> },
      { path: 'templates/edit/:id',     element: <S><TemplateCreate /></S> },

      // Feedbacks & Surveys
      { path: 'feedbacks',         element: <S><FeedbacksManagement /></S> },
      { path: 'feedbacks/:type',   element: <S><FeedbacksManagement /></S> },
      { path: 'surveys',           element: <S><SurveysManagement /></S> },
      { path: 'surveys/:type',     element: <S><SurveysManagement /></S> },

      // Facilities
      { path: 'social-facilities',     element: <S><SocialFacilitiesManagement /></S> },
      { path: 'affiliated-facilities', element: <S><AffiliatedFacilitiesManagement /></S> },
      { path: 'trading-facilities',    element: <S><TradingFacilitiesManagement /></S> },

      // Reports (match adminMenu paths)
      { path: 'report/DCBC',  element: <S><Report_DCBC /></S> },
      { path: 'report/KSHL',  element: <S><Report_KSHL /></S> },
      { path: 'report/TCT01', element: <S><Report_TCT01 /></S> },

      { path: 'smtp', element: <S><SmtpSettings /></S> },
    ],
  },

  // ── Public (with Header/Footer layout) ────────────────────────────────────
  {
    path: '/',
    element: <S><PublicLayout /></S>,
    children: [
      { index: true,                        element: <S><Home /></S> },

      // News
      { path: 'news/:categoryId',           element: <S><NewsCategory /></S> },
      { path: 'news/detail/:id',            element: <S><NewsDetail /></S> },

      // Forms
      { path: 'formsList',                  element: <S><FormList /></S> },
      { path: 'formsList/:type',            element: <S><FormList /></S> },
      { path: 'forms/:id',                  element: <S><FormDetail /></S> },

      // Pages
      { path: 'policy',                     element: <S><PolicyHealthInsurance /></S> },
      { path: 'data-lookup',                element: <S><DataLookup /></S> },
      { path: 'hanoi-system',               element: <S><HanoiSystem /></S> },
      { path: 'consulting',                 element: <S><HealthConsultation /></S> },
      { path: 'emergency',                  element: <S><EmergencyCenter /></S> },
      { path: 'digital-transformation',     element: <S><DigitalTransformation /></S> },
      { path: 'work-schedule',              element: <S><WorkSchedule /></S> },

      // External redirect for schedule
      { path: 'schedule', element: <ExternalRedirect to="http://lichcongtac.qnict.vn/sythanoi/" /> },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])
