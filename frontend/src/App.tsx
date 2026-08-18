import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { useAuth } from './context/AuthContext'
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
    return <LandingPage />
  }

  return <Navigate to={dashboardRouteForRole(session.role)} replace />
}

const ALL_ROLES = ['student', 'admin', 'faculty', 'placement_cell', 'parent', 'recruiter'] as const
const NON_RECRUITER_ROLES = ['student', 'admin', 'faculty', 'placement_cell', 'parent'] as const

function App() {
  return (
    <Suspense fallback={<div className="loading page">Loading page...</div>}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/dashboard" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Dashboard Role Routes */}
        <Route
          path="/dashboard/student"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <AppLayout>
                <StudentDashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <AdminDashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/parent"
          element={
            <ProtectedRoute allowedRoles={['parent']}>
              <AppLayout>
                <ParentDashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/faculty"
          element={
            <ProtectedRoute allowedRoles={['faculty']}>
              <AppLayout>
                <FacultyDashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/placement"
          element={
            <ProtectedRoute allowedRoles={['placement_cell']}>
              <AppLayout>
                <PlacementDashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/recruiter"
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

        {/* Short redirects */}
        <Route path="/student" element={<Navigate to="/dashboard/student" replace />} />
        <Route path="/admin" element={<Navigate to="/dashboard/admin" replace />} />
        <Route path="/parent" element={<Navigate to="/dashboard/parent" replace />} />
        <Route path="/faculty" element={<Navigate to="/dashboard/faculty" replace />} />
        <Route path="/placement" element={<Navigate to="/dashboard/placement" replace />} />
        <Route path="/recruiter" element={<Navigate to="/dashboard/recruiter" replace />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default App
