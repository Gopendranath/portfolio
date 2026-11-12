import type { ReactNode } from 'react'

interface ChatNavCardProps {
  avatar: ReactNode
  title: string
  subtitle: string
  pressed?: boolean
  badge?: number
  ariaControls?: string
  onClick: () => void
}

export function ChatNavCard({
  avatar,
  title,
  subtitle,
  pressed,
  badge,
  ariaControls,
  onClick,
}: ChatNavCardProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-controls={ariaControls}
      onClick={onClick}
      className={`relative flex min-w-0 items-center gap-2.5 border p-3 text-left transition-colors ${
        pressed
          ? 'border-line bg-surface/70'
          : 'border-transparent hover:border-line hover:bg-surface/40'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-px transition-colors ${
          pressed ? 'bg-accent' : 'bg-transparent'
        }`}
      />
      <span className="hidden shrink-0 min-[390px]:block">{avatar}</span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium leading-tight text-ink md:text-sm">
          {title}
        </span>
        <span className="mt-1 block font-mono text-[9px] uppercase leading-tight tracking-[0.14em] text-muted">
          {subtitle}
        </span>
      </span>
      {badge ? (
        <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-[9px] text-accent-ink">
          {badge}
        </span>
      ) : null}
    </button>
  )
}
