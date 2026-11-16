import { TechnologyIcon } from '@/components/ui/technology-icon'
import { stackItemIcons } from './stack-icons'

interface StackListProps {
  items: readonly string[]
  className?: string
}

export function StackList({ items, className }: StackListProps) {
  return (
    <ul className={['flex flex-wrap gap-1.5', className ?? ''].filter(Boolean).join(' ')}>
      {items.map((item) => {
        const icon = stackItemIcons[item]

        return (
          <li
            key={item}
            translate="no"
            className="flex cursor-target items-center gap-1.5 border border-line bg-surface/60 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-accent hover:bg-accent/10 hover:text-accent"
          >
            {icon ? <TechnologyIcon brand name={icon} className="size-4 shrink-0" /> : null}
            {item}
          </li>
        )
      })}
    </ul>
  )
}
