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
            className="flex cursor-target items-center gap-2 px-1 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-accent"
          >
            {icon ? <TechnologyIcon brand name={icon} className="size-5 shrink-0" /> : null}
            {item}
          </li>
        )
      })}
    </ul>
  )
}
