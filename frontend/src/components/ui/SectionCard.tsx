import type { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export function SectionCard({ title, subtitle, action, children }: SectionCardProps) {
  return (
    <section className="card">
      <div className="topbar">
        <div>
          <h3 className="card-title">{title}</h3>
          {subtitle ? (
            <p className="subtle" style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
