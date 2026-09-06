import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { useAuth } from '../../context/useAuth'
import { ThemeToggle } from '../ui/ThemeToggle'
import type { Role } from '../../types/auth'

/* ── SVG Icons ────────────────────────────────────────────────────── */

const OverviewIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)

const AcademicsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
    <path d="M4 5c2-1 5-1 7 0v14c-2-1-5-1-7 0V5Z" />
    <path d="M20 5c-2-1-5-1-7 0v14c2-1 5-1 7 0V5Z" />
  </svg>
)

const AttendanceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const SkillsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" width="18" height="18">
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
  </svg>
)

const PlacementIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M3 12h18" />
  </svg>
)

const RiskIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" width="18" height="18">
    <path d="M12 3 2 20h20L12 3Z" />
    <path d="M12 9v5" />
    <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
  </svg>
)

const ImportIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 15" />
  </svg>
)

const BillingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
    <line x1="6" y1="15" x2="10" y2="15" />
  </svg>
)

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
  </svg>
)

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

/* ── Helpers ────────────────────────────────────────────────────── */

interface NavEntry {
  label: string
  href: string
  icon: React.FC
}

function getNavItems(role: Role): NavEntry[] {
  if (role === 'admin') {
    return [
      { label: 'Overview', href: '/admin', icon: OverviewIcon },
      { label: 'Bulk Import', href: '/admin/bulk-import', icon: ImportIcon },
      { label: 'Import History', href: '/admin/import-history', icon: HistoryIcon },
      { label: 'Billing & Plans', href: '/admin/billing', icon: BillingIcon },
      { label: 'Academics', href: '/features/academics', icon: AcademicsIcon },
      { label: 'Attendance', href: '/features/attendance', icon: AttendanceIcon },
      { label: 'Placement Readiness', href: '/features/placement', icon: PlacementIcon },
      { label: 'Risk & Alerts', href: '/features/risk', icon: RiskIcon },
    ]
  }

  if (role === 'faculty') {
    return [
      { label: 'Overview', href: '/faculty', icon: OverviewIcon },
      { label: 'Academics', href: '/features/academics', icon: AcademicsIcon },
      { label: 'Attendance', href: '/features/attendance', icon: AttendanceIcon },
      { label: 'Risk & Alerts', href: '/features/risk', icon: RiskIcon },
      { label: 'Skills & Assessments', href: '/features/skills', icon: SkillsIcon },
    ]
  }

  if (role === 'placement_cell') {
    return [
      { label: 'Overview', href: '/placement', icon: OverviewIcon },
      { label: 'Placement Readiness', href: '/features/placement', icon: PlacementIcon },
      { label: 'Skills & Talent', href: '/features/skills', icon: SkillsIcon },
    ]
  }

  if (role === 'recruiter') {
    return [
      { label: 'Overview', href: '/recruiter', icon: OverviewIcon },
      { label: 'Placement & Talent', href: '/features/placement', icon: PlacementIcon },
    ]
  }

  if (role === 'parent') {
    return [
      { label: 'Ward Overview', href: '/parent', icon: OverviewIcon },
      { label: 'Academics', href: '/features/academics', icon: AcademicsIcon },
      { label: 'Attendance', href: '/features/attendance', icon: AttendanceIcon },
      { label: 'Risk & Interventions', href: '/features/risk', icon: RiskIcon },
    ]
  }

  // Student default
  return [
    { label: 'Overview', href: '/student', icon: OverviewIcon },
    { label: 'Academics', href: '/features/academics', icon: AcademicsIcon },
    { label: 'Attendance', href: '/features/attendance', icon: AttendanceIcon },
    { label: 'Skills & Portfolio', href: '/features/skills', icon: SkillsIcon },
    { label: 'Placement Readiness', href: '/features/placement', icon: PlacementIcon },
    { label: 'Risk & Alerts', href: '/features/risk', icon: RiskIcon },
  ]
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getRoleLabel(role: Role): string {
  const labels: Record<string, string> = {
    student: 'STUDENT',
    admin: 'ADMIN',
    faculty: 'FACULTY',
    parent: 'PARENT',
    placement_cell: 'PLACEMENT',
    recruiter: 'RECRUITER',
  }
  return labels[role] ?? role.toUpperCase()
}

function getSessionPill(role: Role): { cls: string; text: string } {
  switch (role) {
    case 'admin':
    case 'faculty':
      return { cls: 'secure', text: '2FA verified · write access active' }
    case 'parent':
      return { cls: 'locked', text: 'Read-only session · no write access' }
    default:
      return { cls: 'standard', text: 'Standard session · device remembered' }
  }
}

/* ── Component ─────────────────────────────────────────────────── */

export function AppLayout({ children }: { children: ReactNode }) {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  if (!session) return null

  const navItems = getNavItems(session.role)
  const initials = getInitials(session.name)
  const roleLabel = getRoleLabel(session.role)
  const pill = getSessionPill(session.role)

  const onLogout = () => {
    logout()
    navigate('/login')
  }

  const closeMobileNav = () => setMobileNavOpen(false)

  return (
    <div className="layout">
      <button
        type="button"
        className="fg-mobile-nav-toggle"
        aria-label="Open navigation"
        aria-expanded={mobileNavOpen}
        onClick={() => setMobileNavOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>
      {mobileNavOpen && <button type="button" className="fg-mobile-nav-backdrop" aria-label="Close navigation" onClick={closeMobileNav} />}
      {/* ===== SIDEBAR ===== */}
      <aside className={`sidebar${mobileNavOpen ? ' mobile-open' : ''}`}>
        <div className="fg-brand">
          <div className="fg-glyph">F</div>
          <span>FORGR</span>
        </div>

        <div className="fg-nav-label">Workspace</div>
        {navItems.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <NavLink
              key={item.label}
              to={item.href}
              className={`fg-nav-item${isActive ? ' active' : ''}`}
              onClick={closeMobileNav}
            >
              <item.icon />
              {item.label}
            </NavLink>
          )
        })}

        <div className="fg-nav-label">System</div>
        <NavLink
          to="/features/settings"
          className={`fg-nav-item${location.pathname === '/features/settings' ? ' active' : ''}`}
          onClick={closeMobileNav}
        >
          <SettingsIcon />
          Settings
        </NavLink>

        <button type="button" className="fg-logout-btn" onClick={onLogout}>
          <LogoutIcon />
          Logout
        </button>

        <div className="fg-sidebar-foot">
          <div className="fg-avatar-sm">{initials}</div>
          <div className="fg-who">
            <div>{session.name}</div>
            <div className="fg-role">{roleLabel}</div>
          </div>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <main className="main">
        <div className="topbar">
          <div>
            <h1>
              {location.pathname === '/features/academics' ? 'Academic Intelligence' :
               location.pathname === '/features/attendance' ? 'Attendance Analytics' :
               location.pathname === '/features/skills' ? 'Skills & Portfolio' :
               location.pathname === '/features/placement' ? 'Placement Readiness' :
               location.pathname === '/features/risk' ? 'Risk Engine & Alerts' :
               location.pathname === '/features/settings' ? 'Settings & Preferences' :
               session.role === 'student' ? 'Your profile' :
               session.role === 'admin' || session.role === 'faculty' ? 'Cohort overview' :
               session.role === 'parent' ? "Ward's report" : 'Dashboard'}
              {session.role === 'parent' && (
                <span className="fg-readonly-pill">🔒 VIEW ONLY</span>
              )}
            </h1>
            <div className="fg-sub">
              {location.pathname.startsWith('/features/')
                ? 'Direct feature intelligence view.'
                : session.role === 'student'
                  ? 'Everything FORGR has forged from your record so far.'
                  : session.role === 'admin' || session.role === 'faculty'
                    ? `Tracking students across sections.`
                    : session.role === 'parent'
                      ? "A read-only summary generated from your ward's FORGR profile."
                      : `Welcome, ${session.name}.`}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ThemeToggle />
            <div className={`fg-session-pill ${pill.cls}`}>
              <span className="fg-dot" />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                {pill.cls === 'secure' ? (
                  <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
                ) : pill.cls === 'locked' ? (
                  <>
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                ) : (
                  <>
                    <rect x="4" y="10" width="16" height="10" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </>
                )}
              </svg>
              <span>{pill.text}</span>
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
