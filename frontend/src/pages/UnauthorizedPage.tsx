import { Link } from 'react-router-dom'

export function UnauthorizedPage() {
  return (
    <div className="page" style={{ paddingTop: '4rem' }}>
      <section className="card">
        <h2 className="headline" style={{ fontSize: '2rem' }}>
          Unauthorized Access
        </h2>
        <p className="subtle">Your account role does not have access to this dashboard.</p>
        <p>
          Go back to <Link to="/">your workspace</Link>.
        </p>
      </section>
    </div>
  )
}
