import type { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  action?: ReactNode
  children: ReactNode
}

export function SectionCard({ title, action, children }: SectionCardProps) {
  return (
    <section className="card">
      <div className="topbar">
        <h3 className="card-title">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}
