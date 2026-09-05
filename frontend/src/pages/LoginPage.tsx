import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import type { LoginPayload } from '../types/auth'

type RoleKey = 'student' | 'faculty' | 'placement' | 'recruiter' | 'parent' | 'admin'

const roleCopy: Record<
  RoleKey,
  { label: string; placeholder: string; sub: string }
> = {
  student: {
    label: 'Email or Student ID (e.g. 1001)',
    placeholder: 'student@forgr.app or 1001',
    sub: 'Sign in to your FORGR student analytics dashboard.',
  },
  faculty: {
    label: 'Staff email',
    placeholder: 'faculty@forgr.app',
    sub: 'Sign in to manage cohorts, attendance & academic risk.',
  },
  placement: {
    label: 'Placement Cell email',
    placeholder: 'placement@forgr.app',
    sub: 'Sign in to review placement readiness, ATS scores & drives.',
  },
  recruiter: {
    label: 'Recruiter email',
    placeholder: 'recruiter@forgr.app',
    sub: 'Sign in to evaluate candidate talent & verified skills.',
  },
  parent: {
    label: 'Registered Parent email',
    placeholder: 'parent1@forgr.app or parent1001',
    sub: "Sign in to view your ward's attendance & semester progress.",
  },
  admin: {
    label: 'Admin email',
    placeholder: 'admin@forgr.app',
    sub: 'Administrator sign-in with full system analytics.',
  },
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

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  const fromPath = (location.state as { from?: string } | null)?.from
  const copy = roleCopy[activeRole]

  const handleRoleSwitch = (role: RoleKey) => {
    setActiveRole(role)
    setEmail('')
    setPassword('')
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      await login({ email, password } satisfies LoginPayload)
      navigate(fromPath ?? '/dashboard', { replace: true })
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
              <div className="forgr-num">5,000+</div>
              <div className="forgr-lbl">Profiles indexed</div>
            </div>
            <div className="forgr-gauge-item">
              <div className="forgr-num">06</div>
              <div className="forgr-lbl">Scoped roles</div>
            </div>
            <div className="forgr-gauge-item">
              <div className="forgr-num">JWT</div>
              <div className="forgr-lbl">Secured sessions</div>
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
          <div className="forgr-role-tabs" role="tablist" aria-label="Sign in as" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {(['student', 'faculty', 'placement', 'recruiter', 'parent', 'admin'] as RoleKey[]).map((role) => (
              <button
                key={role}
                className={`forgr-role-tab${activeRole === role ? ' active' : ''}`}
                type="button"
                onClick={() => handleRoleSwitch(role)}
                style={{ padding: '8px 4px', fontSize: '0.75rem' }}
              >
                {role === 'student' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14">
                    <path d="M12 3 2 8l10 5 10-5-10-5Z" />
                    <path d="M6 10.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-5.5" />
                  </svg>
                )}
                {role === 'faculty' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14">
                    <path d="M4 5c2-1 5-1 7 0v14c-2-1-5-1-7 0V5Z" />
                    <path d="M20 5c-2-1-5-1-7 0v14c2-1 5-1 7 0V5Z" />
                  </svg>
                )}
                {role === 'placement' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14">
                    <rect x="3" y="7" width="18" height="13" rx="2" />
                    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                )}
                {role === 'recruiter' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <polyline points="16 11 18 13 22 9" />
                  </svg>
                )}
                {role === 'parent' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14">
                    <path d="M3 11.5 12 4l9 7.5" />
                    <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5h4v5h3.5a1 1 0 0 0 1-1v-9" />
                  </svg>
                )}
                {role === 'admin' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14">
                    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
                  </svg>
                )}
                {role === 'placement' ? 'PLACEMENT' : role.toUpperCase()}
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
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
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
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
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
              <button
                type="button"
                onClick={() => alert('For password reset support, please contact your university IT department or campus administrator.')}
                style={{ background: 'none', border: 'none', color: 'var(--amber)', cursor: 'pointer', fontSize: '0.82rem', padding: 0 }}
              >
                Forgot Password?
              </button>
            </div>

            {/* Error */}
            {error && <div className="forgr-error">{error}</div>}

            {/* Submit */}
            <button className="forgr-btn-forge" type="submit" disabled={isSubmitting}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
              </svg>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>

            {/* SSO */}
            <div className="forgr-divider">or continue with</div>
            <div className="forgr-sso-row">
              <button className="forgr-sso-btn" type="button" onClick={() => alert('Single Sign-On (SSO) integration is enabled for verified university email domains.')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18" />
                </svg>
                Google SSO
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
            First time on FORGR?{' '}
            <button
              type="button"
              onClick={() => alert('New student and staff accounts are provisioned directly by your campus administrator. Use your university email or student ID to sign in, or contact your department admin.')}
              style={{ background: 'none', border: 'none', color: 'var(--ember)', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, padding: 0 }}
            >
              Create Account / Sign Up →
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
