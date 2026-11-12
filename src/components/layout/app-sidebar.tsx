import { Link } from '@tanstack/react-router'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Avatar } from '@/components/ui/avatar'
import { DownloadIcon } from '@/components/ui/icons'
import { ScrambleText } from '@/components/ui/scramble-text'
import { SocialLinks } from '@/components/ui/social-links'
import { StatusBadge } from '@/components/ui/status-badge'
import { profile } from '@/data/profile'
import { siteYear } from '@/lib/seo'
import { PrimaryNav } from './primary-nav'

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col overflow-y-auto overscroll-contain border-r border-line bg-canvas/95 px-6 py-8 lg:flex">
      <Link to="/" className="group flex items-start gap-3">
        <span className="avatar-frame relative block size-10 shrink-0 overflow-hidden border border-line transition-colors group-hover:border-accent/60">
          <Avatar className="size-full" sizes="40px" priority />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-ink" translate="no">
            {profile.name}
          </span>
          <span className="mt-1.5 block font-mono text-[9px] uppercase leading-relaxed tracking-[0.16em] text-muted">
            <ScrambleText text={profile.role} animateOnHover />
          </span>
        </span>
      </Link>

      <a
        href={profile.locationUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="cursor-target mt-4 block font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-muted transition-colors hover:text-accent"
      >
        <span className="block">{profile.location}</span>
        <span className="block">{profile.timezone}</span>
      </a>

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
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Theme</span>
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
