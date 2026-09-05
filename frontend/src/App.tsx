import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { useAuth } from './context/useAuth'
import { dashboardRouteForRole } from './utils/routes'

const LandingPage = lazy(() =>
  import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })),
)
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const UnauthorizedPage = lazy(() =>
  import('./pages/UnauthorizedPage').then((module) => ({ default: module.UnauthorizedPage })),
)
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
)

// Dashboards
const StudentDashboardPage = lazy(() =>
  import('./pages/student/StudentDashboardPage').then((module) => ({
    default: module.StudentDashboardPage,
  })),
)
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((module) => ({
    default: module.AdminDashboardPage,
  })),
)
const AdminBulkImportPage = lazy(() =>
  import('./pages/admin/AdminBulkImportPage').then((module) => ({
    default: module.AdminBulkImportPage,
  })),
)
const AdminImportHistoryPage = lazy(() =>
  import('./pages/admin/AdminImportHistoryPage').then((module) => ({
    default: module.AdminImportHistoryPage,
  })),
)
const AdminAuditLogsPage = lazy(() =>
  import('./pages/admin/AdminAuditLogsPage').then((module) => ({
    default: module.AdminAuditLogsPage,
  })),
)
const ParentDashboardPage = lazy(() =>
  import('./pages/parent/ParentDashboardPage').then((module) => ({
    default: module.ParentDashboardPage,
  })),
)
const FacultyDashboardPage = lazy(() =>
  import('./pages/faculty/FacultyDashboardPage').then((module) => ({
    default: module.FacultyDashboardPage,
  })),
)
const PlacementDashboardPage = lazy(() =>
  import('./pages/placement/PlacementDashboardPage').then((module) => ({
    default: module.PlacementDashboardPage,
  })),
)
const RecruiterDashboardPage = lazy(() =>
  import('./pages/recruiter/RecruiterDashboardPage').then((module) => ({
    default: module.RecruiterDashboardPage,
  })),
)

// Feature pages
const AcademicsPage = lazy(() =>
  import('./pages/features/AcademicsPage').then((module) => ({ default: module.AcademicsPage })),
)
const AttendancePage = lazy(() =>
  import('./pages/features/AttendancePage').then((module) => ({ default: module.AttendancePage })),
)
const SkillsPage = lazy(() =>
  import('./pages/features/SkillsPage').then((module) => ({ default: module.SkillsPage })),
)
const PlacementReadinessPage = lazy(() =>
  import('./pages/features/PlacementReadinessPage').then((module) => ({ default: module.PlacementReadinessPage })),
)
const RiskAlertsPage = lazy(() =>
  import('./pages/features/RiskAlertsPage').then((module) => ({ default: module.RiskAlertsPage })),
)
const SettingsPage = lazy(() =>
  import('./pages/features/SettingsPage').then((module) => ({ default: module.SettingsPage })),
)

function HomeRedirect() {
  const { session } = useAuth()

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={dashboardRouteForRole(session.role)} replace />
}

const ALL_ROLES = ['student', 'admin', 'faculty', 'placement_cell', 'parent', 'recruiter'] as const
const NON_RECRUITER_ROLES = ['student', 'admin', 'faculty', 'placement_cell', 'parent'] as const

function App() {
  return (
    <Suspense fallback={<div className="loading page">Loading page...</div>}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/dashboard" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Canonical Role Routes */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <AppLayout>
                <StudentDashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <AdminDashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/bulk-import"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <AdminBulkImportPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/import-history"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <AdminImportHistoryPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <AdminAuditLogsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/parent"
          element={
            <ProtectedRoute allowedRoles={['parent']}>
              <AppLayout>
                <ParentDashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/faculty"
          element={
            <ProtectedRoute allowedRoles={['faculty']}>
              <AppLayout>
                <FacultyDashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/placement"
          element={
            <ProtectedRoute allowedRoles={['placement_cell']}>
              <AppLayout>
                <PlacementDashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter"
          element={
            <ProtectedRoute allowedRoles={['recruiter']}>
              <AppLayout>
                <RecruiterDashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Dedicated Feature Routes */}
        <Route
          path="/features/academics"
          element={
            <ProtectedRoute allowedRoles={[...ALL_ROLES]}>
              <AppLayout>
                <AcademicsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/features/attendance"
          element={
            <ProtectedRoute allowedRoles={[...NON_RECRUITER_ROLES]}>
              <AppLayout>
                <AttendancePage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/features/skills"
          element={
            <ProtectedRoute allowedRoles={[...ALL_ROLES]}>
              <AppLayout>
                <SkillsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/features/placement"
          element={
            <ProtectedRoute allowedRoles={[...ALL_ROLES]}>
              <AppLayout>
                <PlacementReadinessPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/features/risk"
          element={
            <ProtectedRoute allowedRoles={[...NON_RECRUITER_ROLES]}>
              <AppLayout>
                <RiskAlertsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/features/settings"
          element={
            <ProtectedRoute allowedRoles={[...ALL_ROLES]}>
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Backward-compatibility /dashboard/* redirects */}
        <Route path="/dashboard/student" element={<Navigate to="/student" replace />} />
        <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />
        <Route path="/dashboard/parent" element={<Navigate to="/parent" replace />} />
        <Route path="/dashboard/faculty" element={<Navigate to="/faculty" replace />} />
        <Route path="/dashboard/placement" element={<Navigate to="/placement" replace />} />
        <Route path="/dashboard/recruiter" element={<Navigate to="/recruiter" replace />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default App
