import type { ReactNode } from 'react'

export interface Fact {
  label: string
  value: ReactNode
}

interface FactListProps {
  items: readonly Fact[]
  className?: string
}

export function FactList({ items, className }: FactListProps) {
  return (
    <dl
      className={['divide-y divide-line border-y border-line', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      {items.map((fact) => (
        <div key={fact.label} className="flex items-start justify-between gap-6 py-3">
          <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            {fact.label}
          </dt>
          <dd className="text-right text-sm text-ink">{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}
