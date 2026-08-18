import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { dashboardRouteForRole } from '../utils/routes'

interface DashboardScaffoldPageProps {
  title: string
  subtitle: string
  bullets: string[]
}

export function DashboardScaffoldPage({ title, subtitle, bullets }: DashboardScaffoldPageProps) {
  const { session } = useAuth()

  return (
    <div className="grid stagger">
      <header className="dashboard-hero">
        <p className="eyebrow">{session?.role ?? 'Dashboard'}</p>
        <h2 className="headline" style={{ fontSize: '1.8rem' }}>
          {title}
        </h2>
        <p className="subtle">{subtitle}</p>
      </header>

      <section className="grid two">
        <article className="card">
          <div className="stat-title">Signed in as</div>
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>
            {session?.name ?? 'Guest'}
          </div>
          <p className="subtle">{session?.email}</p>
          {session ? (
            <Link className="btn btn-primary" to={dashboardRouteForRole(session.role)} style={{ display: 'inline-flex', textDecoration: 'none' }}>
              Open my dashboard
            </Link>
          ) : null}
        </article>

        <article className="card">
          <div className="stat-title">What this role will see</div>
          <ul>
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  )
}
