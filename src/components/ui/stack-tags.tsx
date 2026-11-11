interface StackTagsProps {
  items: readonly string[]
  className?: string
  hover?: boolean
}

export function StackTags({ items, className, hover }: StackTagsProps) {
  return (
    <ul
      className={['flex flex-wrap gap-1.5', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      {items.map((item) => (
        <li
          key={item}
          translate="no"
          className={[
            'border border-line bg-surface/60 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted',
            hover
              ? 'cursor-target transition-colors hover:border-accent hover:bg-accent/10 hover:text-accent'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {item}
        </li>
      ))}
    </ul>
  )
}
