import type { ReactNode } from 'react'
import { SectionLabel } from './section-label'

interface PageSectionProps {
  label: string
  ariaLabel?: string
  className?: string
  children: ReactNode
}

/** Section block with the shared top rule and label rhythm used across pages. */
export function PageSection({
  label,
  ariaLabel,
  className,
  children,
}: PageSectionProps) {
  return (
    <section
      aria-label={ariaLabel ?? label}
      className={['mt-20 border-t border-line pt-10', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <SectionLabel>{label}</SectionLabel>
      {children}
    </section>
  )
}
