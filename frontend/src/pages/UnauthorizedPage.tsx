import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { dashboardRouteForRole } from '../utils/routes'

export function UnauthorizedPage() {
  const { session } = useAuth()
  const returnRoute = session ? dashboardRouteForRole(session.role) : '/login'

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div
        className="card"
        style={{
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          padding: '3rem 2rem',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            padding: '3px 10px',
            borderRadius: '12px',
            background: 'rgba(240, 84, 106, 0.15)',
            color: '#f0546a',
            border: '1px solid rgba(240, 84, 106, 0.3)',
          }}
        >
          403 FORBIDDEN · ACCESS RESTRICTED
        </span>
        <h1 className="headline" style={{ fontSize: '2rem', margin: '1rem 0 0.5rem 0' }}>
          Restricted Resource
        </h1>
        <p className="subtle" style={{ fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '2rem' }}>
          Your authenticated role{' '}
          <strong style={{ color: 'var(--accent)' }}>({session?.role?.toUpperCase() || 'ANONYMOUS'})</strong>{' '}
          is not authorized to view this administrative or protected student resource.
        </p>
        <Link
          to={returnRoute}
          className="button"
          style={{
            display: 'inline-block',
            background: 'var(--accent)',
            color: '#0c0e12',
            fontWeight: 700,
            padding: '0.8rem 2rem',
            borderRadius: '8px',
          }}
        >
          Return to Your Dashboard →
        </Link>
      </div>
    </div>
  )
}

