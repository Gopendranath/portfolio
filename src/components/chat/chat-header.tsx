import type { ReactNode } from 'react'
import { ArrowLeftIcon } from '@/components/ui/icons'

interface ChatHeaderProps {
  title: string
  subtitle: string
  titleId?: string
  level?: 1 | 2
  avatar?: ReactNode
  onBack?: () => void
  backLabel?: string
  actions?: ReactNode
  className?: string
}

export function ChatHeader({
  title,
  subtitle,
  titleId,
  level = 2,
  avatar,
  onBack,
  backLabel = 'Back',
  actions,
  className = 'flex',
}: ChatHeaderProps) {
  const Heading = level === 1 ? 'h1' : 'h2'

  return (
    <header className={`h-20 shrink-0 items-center gap-3 border-b border-line px-4 ${className}`}>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="flex size-8 shrink-0 items-center justify-center border border-line text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <ArrowLeftIcon className="size-4" />
        </button>
      ) : null}
      {avatar}
      <div className="min-w-0 flex-1">
        <Heading id={titleId} className="truncate text-xl font-medium tracking-[-0.02em] text-ink">
          {title}
        </Heading>
        <p className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
          {subtitle}
        </p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}
