import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="page" style={{ paddingTop: '4rem' }}>
      <section className="card">
        <h2 className="headline" style={{ fontSize: '2rem' }}>
          Page Not Found
        </h2>
        <p className="subtle">The page you requested is not available.</p>
        <p>
          Return to <Link to="/">dashboard home</Link>.
        </p>
      </section>
    </div>
  )
}
