import { Link } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { profile } from '../../data/profile'
import { CloseIcon, DownloadIcon, MenuIcon } from '../ui/icons'
import { SocialLinks } from '../ui/social-links'
import { StatusBadge } from '../ui/status-badge'
import { Monogram } from './monogram'
import { PrimaryNav } from './primary-nav'
import { useSidebar } from './sidebar-context'

export function MobileNav() {
  const { isOpen, open, close } = useSidebar()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    if (isOpen && !dialog.open) {
      dialog.showModal()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-canvas/95 px-5 backdrop-blur-md lg:hidden">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <Monogram className="size-9 text-xs" />
          <span className="truncate text-sm font-medium text-ink">
            {profile.name}
          </span>
        </Link>
        <button
          type="button"
          onClick={open}
          aria-label="Open navigation"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          className="inline-flex size-10 shrink-0 items-center justify-center border border-line text-ink transition-colors hover:border-accent hover:text-accent"
        >
          <MenuIcon className="size-5" />
        </button>
      </header>

      <dialog
        ref={dialogRef}
        id="mobile-navigation"
        aria-label="Site navigation"
        onClose={close}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            close()
          }
        }}
        className="m-0 h-dvh max-h-none w-[min(88vw,340px)] max-w-none border-r border-line bg-canvas p-0 text-ink [&::backdrop]:bg-black/75 [&::backdrop]:backdrop-blur-sm"
      >
        <div className="flex h-full flex-col overflow-y-auto px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              onClick={close}
              className="flex min-w-0 items-center gap-3"
            >
              <Monogram className="size-9 text-xs" />
              <span className="min-w-0">
                <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
                  Portfolio / 2026
                </span>
                <span className="mt-0.5 block truncate text-sm font-medium text-ink">
                  {profile.name}
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={close}
              aria-label="Close navigation"
              className="inline-flex size-9 shrink-0 items-center justify-center border border-line text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>

          <PrimaryNav className="mt-10" onNavigate={close} />

          <div className="mt-auto space-y-6 border-t border-line pt-6">
            <StatusBadge label={profile.availability} />
            <SocialLinks />
            <button
              type="button"
              disabled
              className="flex w-full items-center justify-between border border-line px-3 py-3 text-left font-mono text-[9px] uppercase tracking-[0.14em] text-muted opacity-60"
            >
              <span>Resume — coming soon</span>
              <DownloadIcon className="size-3.5" />
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
