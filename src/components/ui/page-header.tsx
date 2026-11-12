interface PageHeaderProps {
  eyebrow: string
  title: string
  description?: string
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="max-w-4xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">{eyebrow}</p>
      <h1 className="mt-5 text-balance text-[clamp(2.75rem,7vw,5.5rem)] font-medium leading-[0.95] tracking-[-0.045em] text-ink">
        {title}
      </h1>
      {description ? (
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          {description}
        </p>
      ) : null}
    </header>
  )
}
