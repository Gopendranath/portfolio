import { Link } from '@tanstack/react-router'
import { navItems } from '../../data/navigation'

interface PrimaryNavProps {
  className?: string
  onNavigate?: () => void
}

export function PrimaryNav({ className = '', onNavigate }: PrimaryNavProps) {
  return (
    <nav aria-label="Primary" className={className}>
      <ul className="space-y-1">
        {navItems.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              onClick={onNavigate}
              activeProps={{ 'aria-current': 'page' }}
              className="group relative flex items-baseline gap-4 py-2.5 pl-4 pr-2 transition-colors hover:text-ink"
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-1 left-0 w-px transition-colors ${
                      isActive ? 'bg-accent' : 'bg-transparent'
                    }`}
                  />
                  <span
                    className={`font-mono text-[10px] tracking-[0.18em] ${
                      isActive ? 'text-accent' : 'text-muted/70'
                    }`}
                  >
                    {item.index}
                  </span>
                  <span
                    className={`text-[15px] ${
                      isActive ? 'text-accent' : 'text-muted'
                    }`}
                  >
                    {item.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`ml-auto h-px w-6 transition-colors ${
                      isActive ? 'bg-accent' : 'bg-line/60 group-hover:bg-muted'
                    }`}
                  />
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
