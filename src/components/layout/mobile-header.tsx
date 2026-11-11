import { Link } from '@tanstack/react-router'
import { profile } from '../../data/profile'
import { ThemeToggle } from '../theme/theme-toggle'
import { Avatar } from '../ui/avatar'

export function MobileHeader() {
  return (
    <header className="safe-x sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-canvas/95 backdrop-blur-md lg:hidden">
      <Link to="/" className="flex min-h-11 min-w-0 items-center gap-3">
        <Avatar className="size-9 border border-line" sizes="36px" priority />
        <span className="truncate text-sm font-medium text-ink" translate="no">
          {profile.name}
        </span>
      </Link>
      <ThemeToggle className="min-h-11" />
    </header>
  )
}
