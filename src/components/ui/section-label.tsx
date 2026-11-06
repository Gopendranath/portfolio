import type { ReactNode } from 'react'

interface SectionLabelProps {
  children: ReactNode
  className?: string
}

export function SectionLabel({ children, className = '' }: SectionLabelProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        {children}
      </span>
      <span className="h-px flex-1 bg-line" aria-hidden="true" />
    </div>
  )
}
