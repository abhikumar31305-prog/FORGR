import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { dashboardRouteForRole } from '../utils/routes'
import type { LoginPayload } from '../types/auth'

type RoleKey = 'student' | 'faculty' | 'parent' | 'admin'

const roleCopy: Record<
  RoleKey,
  { label: string; placeholder: string; sub: string }
> = {
  student: {
    label: 'Email or roll number',
    placeholder: 'you@college.edu',
    sub: 'Sign in to your FORGR dashboard.',
  },
  faculty: {
    label: 'Staff email',
    placeholder: 'staff@college.edu',
    sub: 'Sign in to manage your cohort.',
  },
  parent: {
    label: 'Registered email',
    placeholder: 'parent@email.com',
    sub: "Sign in to view your ward's report.",
  },
  admin: {
    label: 'Admin email',
    placeholder: 'admin@college.edu',
    sub: 'Administrator sign-in. Two-factor verification is mandatory.',
  },
}

const demoEmails: Record<RoleKey, string> = {
  student: 'student1@mail.com',
  faculty: 'faculty@forgr.app',
  parent: 'parent1@forgr.app',
  admin: 'admin@forgr.app',
}

export function LoginPage() {
  const { login, session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [activeRole, setActiveRole] = useState<RoleKey>('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => { setError('') }, [email, password])

  if (session) {
    return <Navigate to={dashboardRouteForRole(session.role)} replace />
  }

  const fromPath = (location.state as { from?: string } | null)?.from
  const copy = roleCopy[activeRole]

  const handleRoleSwitch = (role: RoleKey) => {
    setActiveRole(role)
    setEmail(demoEmails[role])
    setPassword('demo123')
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const nextSession = await login({ email, password } satisfies LoginPayload)
      navigate(fromPath ?? dashboardRouteForRole(nextSession.role), { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="forgr-login-page">
      <div className="forgr-frame">

        {/* ===== LEFT: SIGNATURE PANEL ===== */}
        <div className="forgr-signature">
          <div className="forgr-grain" />
          <div className="forgr-seam" />
          <div className="forgr-seam s2" />

          <div className="forgr-brand-mark" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }} title="Return to Landing Page">
              <div className="forgr-glyph">F</div>
              <span>FORGR</span>
            </Link>
          </div>

          <div className="forgr-signature-copy">
            <div className="forgr-eyebrow">Student profiling platform</div>
            <h1>
              Every profile,<br />
              <em>forged</em> from real work.
            </h1>
            <p>
              One account, four ways in. Access is scoped the moment you sign
              in — no one sees more than their role allows.
            </p>

            <div className="forgr-security-list">
              <div className="forgr-security-item">
                <div className="forgr-ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
                  </svg>
                </div>
                <div>
                  <div className="forgr-tt">Role-based access, enforced server-side</div>
                  <div className="forgr-dd">Not just hidden in the UI — checked on every request</div>
                </div>
              </div>
              <div className="forgr-security-item">
                <div className="forgr-ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <rect x="4" y="10" width="16" height="10" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                </div>
                <div>
                  <div className="forgr-tt">JWT-secured sessions, every device</div>
                  <div className="forgr-dd">Tokens expire automatically after inactivity</div>
                </div>
              </div>
              <div className="forgr-security-item">
                <div className="forgr-ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M8 6h13M8 12h13M8 18h13" />
                    <circle cx="3.5" cy="6" r="1" fill="currentColor" stroke="none" />
                    <circle cx="3.5" cy="12" r="1" fill="currentColor" stroke="none" />
                    <circle cx="3.5" cy="18" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </div>
                <div>
                  <div className="forgr-tt">Every edit logged and auditable</div>
                  <div className="forgr-dd">Faculty and admin changes are always traceable</div>
                </div>
              </div>
            </div>
          </div>

          <div className="forgr-gauge-row">
            <div className="forgr-gauge-item">
              <div className="forgr-num">12,480</div>
              <div className="forgr-lbl">Profiles secured</div>
            </div>
            <div className="forgr-gauge-item">
              <div className="forgr-num">04</div>
              <div className="forgr-lbl">Scoped roles</div>
            </div>
            <div className="forgr-gauge-item">
              <div className="forgr-num">2FA</div>
              <div className="forgr-lbl">On staff accounts</div>
            </div>
          </div>
        </div>

        {/* ===== RIGHT: FORM ===== */}
        <div className="forgr-form-side">
          <div className="forgr-form-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <Link
                to="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.82rem',
                  color: 'var(--grey)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  marginBottom: '10px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: 'var(--steel-2)',
                  border: '1px solid var(--line-soft)',
                  transition: 'all 0.15s ease',
                }}
                className="forgr-back-btn"
                title="Return to Home Page"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span>Back to Home</span>
              </Link>
              <h2>Welcome back</h2>
              <p>{copy.sub}</p>
            </div>
            <ThemeToggle />
          </div>

          {/* Role tabs */}
          <div className="forgr-role-tabs" role="tablist" aria-label="Sign in as">
            {(['student', 'faculty', 'parent', 'admin'] as RoleKey[]).map((role) => (
              <button
                key={role}
                className={`forgr-role-tab${activeRole === role ? ' active' : ''}`}
                type="button"
                onClick={() => handleRoleSwitch(role)}
              >
                {role === 'student' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M12 3 2 8l10 5 10-5-10-5Z" />
                    <path d="M6 10.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-5.5" />
                  </svg>
                )}
                {role === 'faculty' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M4 5c2-1 5-1 7 0v14c-2-1-5-1-7 0V5Z" />
                    <path d="M20 5c-2-1-5-1-7 0v14c2-1 5-1 7 0V5Z" />
                  </svg>
                )}
                {role === 'parent' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M3 11.5 12 4l9 7.5" />
                    <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5h4v5h3.5a1 1 0 0 0 1-1v-9" />
                  </svg>
                )}
                {role === 'admin' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
                  </svg>
                )}
                {role.toUpperCase()}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit}>
            {/* Email */}
            <div className="forgr-field">
              <label htmlFor="forgr-email">{copy.label}</label>
              <div className="forgr-field-wrap">
                <span className="forgr-field-ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                </span>
                <input
                  id="forgr-email"
                  type="text"
                  placeholder={copy.placeholder}
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="forgr-field">
              <label htmlFor="forgr-password">Password</label>
              <div className="forgr-field-wrap">
                <span className="forgr-field-ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="4" y="10" width="16" height="10" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>
                <input
                  id="forgr-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: 56 }}
                />
                <button
                  type="button"
                  className="forgr-toggle-pw"
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            {/* Remember / forgot */}
            <div className="forgr-row-between">
              <label className="forgr-remember">
                <input type="checkbox" defaultChecked /> Remember this device
              </label>
              <a href="#">Forgot password?</a>
            </div>

            {/* Error */}
            {error && <div className="forgr-error">{error}</div>}

            {/* Submit */}
            <button className="forgr-btn-forge" type="submit" disabled={isSubmitting}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
              </svg>
              {isSubmitting ? 'Signing in...' : 'Continue securely'}
            </button>

            {/* SSO */}
            <div className="forgr-divider">or continue with</div>
            <div className="forgr-sso-row">
              <button className="forgr-sso-btn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18" />
                </svg>
                Google
              </button>
            </div>
          </form>

          {/* Trust row */}
          <div className="forgr-trust-row">
            <div className="forgr-trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="4" y="10" width="16" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              TLS encrypted
            </div>
            <div className="forgr-trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M8 6h13M8 12h13M8 18h13" />
              </svg>
              Full audit log
            </div>
            <div className="forgr-trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
              </svg>
              Role-scoped
            </div>
          </div>

          <div className="forgr-signup-line">
            First time on FORGR? <a href="#">Set up your profile →</a>
          </div>
        </div>

      </div>
    </div>
  )
}
