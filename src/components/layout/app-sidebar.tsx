import { Link } from '@tanstack/react-router'
import { profile } from '../../data/profile'
import { siteYear } from '../../lib/site'
import { ThemeToggle } from '../theme/theme-toggle'
import { Avatar } from '../ui/avatar'
import { DownloadIcon } from '../ui/icons'
import { ScrambleText } from '../ui/scramble-text'
import { SocialLinks } from '../ui/social-links'
import { StatusBadge } from '../ui/status-badge'
import { PrimaryNav } from './primary-nav'

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col overflow-y-auto overscroll-contain border-r border-line bg-canvas/95 px-6 py-8 lg:flex">
      <Link to="/" className="group flex items-center gap-3">
        <Avatar
          className="size-10 border border-line transition-colors group-hover:border-accent/60"
          sizes="40px"
          priority
        />
        <span>
          <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
            Portfolio / 2026
          </span>
          <span className="mt-1 block text-sm font-medium text-ink" translate="no">
            {profile.name}
          </span>
        </span>
      </Link>

      <p className="mt-5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-muted">
        <ScrambleText text={profile.role} animateOnHover />
        <span> — Bengaluru</span>
      </p>

      <PrimaryNav className="mt-12" />

      <div className="mt-auto space-y-6 border-t border-line pt-6">
        <StatusBadge label={profile.availability} />

        <div>
          <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
            Elsewhere
          </p>
          <SocialLinks />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            Theme
          </span>
          <ThemeToggle />
        </div>

        <button
          type="button"
          disabled
          className="flex w-full items-center justify-between border border-line px-3 py-3 text-left font-mono text-[9px] uppercase tracking-[0.14em] text-muted opacity-60"
        >
          <span>Resume — coming soon</span>
          <DownloadIcon className="size-3.5" />
        </button>

        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
          © {siteYear} {profile.firstName}
        </p>
      </div>
    </aside>
  )
}
