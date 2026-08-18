interface SkeletonLoaderProps {
  type?: 'card' | 'text' | 'chart' | 'table'
  rows?: number
}

export function SkeletonLoader({ type = 'card', rows = 3 }: SkeletonLoaderProps) {
  if (type === 'text') {
    return (
      <div style={{ display: 'grid', gap: '0.4rem' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton skeleton-text" style={{ width: i % 2 === 0 ? '100%' : '75%' }} />
        ))}
      </div>
    )
  }

  if (type === 'chart') {
    return <div className="skeleton skeleton-chart" />
  }

  if (type === 'table') {
    return (
      <div style={{ display: 'grid', gap: '0.6rem' }}>
        <div className="skeleton skeleton-text" style={{ width: '100%', height: '2rem' }} />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton skeleton-text" style={{ width: '100%', height: '1.5rem' }} />
        ))}
      </div>
    )
  }

  return <div className="skeleton skeleton-card" />
}
