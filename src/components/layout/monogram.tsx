interface MonogramProps {
  className?: string
}

export function Monogram({ className = '' }: MonogramProps) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-10 shrink-0 place-items-center border border-line bg-surface font-mono text-sm text-accent ${className}`}
    >
      GS
    </span>
  )
}
