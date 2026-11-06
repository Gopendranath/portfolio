interface StatusBadgeProps {
  label: string
  className?: string
}

export function StatusBadge({ label, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] text-ink ${className}`}
    >
      <span className="relative flex size-2 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-accent" />
      </span>
      {label}
    </span>
  )
}
