interface StatusBadgeProps {
  label: string
  className?: string
  iconClassName?: string
}

export function StatusBadge({ label, className = '', iconClassName = 'size-2' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] text-ink ${className}`}
    >
      <span
        className={`relative flex shrink-0 items-center justify-center ${iconClassName}`}
        aria-hidden="true"
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2 rounded-full bg-accent" />
        </span>
      </span>
      {label}
    </span>
  )
}
