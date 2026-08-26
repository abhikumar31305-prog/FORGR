interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    direction: 'up' | 'down' | 'neutral'
    value: string
  }
  badge?: string
}

export function StatCard({ title, value, subtitle, trend, badge }: StatCardProps) {
  return (
    <article className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="stat-title">{title}</div>
        {badge ? <span className="chip chip-soft" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>{badge}</span> : null}
      </div>
      <div className="stat-value">{value}</div>
      {trend ? (
        <div style={{ fontSize: '0.78rem', marginTop: '0.2rem', color: trend.direction === 'up' ? 'var(--teal)' : trend.direction === 'down' ? 'var(--danger)' : 'var(--muted)' }}>
          {trend.direction === 'up' ? '↑ ' : trend.direction === 'down' ? '↓ ' : '• '}{trend.value}
        </div>
      ) : null}
      {subtitle ? <p className="subtle stat-subtitle" style={{ marginTop: '0.2rem' }}>{subtitle}</p> : null}
    </article>
  )
}
