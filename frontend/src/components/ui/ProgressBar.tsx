interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showValue?: boolean
  color?: string
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  color,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div style={{ margin: '0.4rem 0' }}>
      {label || showValue ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
          {label ? <span>{label}</span> : <span />}
          {showValue ? <span className="subtle">{Math.round(percentage)}%</span> : null}
        </div>
      ) : null}
      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{
            width: `${percentage}%`,
            ...(color ? { background: color } : {}),
          }}
        />
      </div>
    </div>
  )
}
