import { createFileRoute } from '@tanstack/react-router'
import { Avatar } from '../components/ui/avatar'
import { DownloadIcon, MapPinIcon } from '../components/ui/icons'
import { PageHeader } from '../components/ui/page-header'
import { SectionLabel } from '../components/ui/section-label'
import { StatusBadge } from '../components/ui/status-badge'
import { profile } from '../data/profile'
import { pageHead } from '../lib/seo'

const principles = [
  {
    title: 'Ship end to end',
    body: 'From the first component to the deployed service, I prefer owning the whole path.',
  },
  {
    title: 'Keep interfaces simple',
    body: 'Good abstractions make the next change cheaper. I optimize for that, not for cleverness.',
  },
  {
    title: 'Learn in public',
    body: 'New tools become useful when they turn into shipped work, not just notes.',
  },
]

export const Route = createFileRoute('/about')({
  head: () =>
    pageHead(
      'About — Gopendranath Sasmal',
      'About Gopendranath Sasmal, a full-stack developer focused on React, TypeScript, Node.js, AI, and maintainable product work.',
    ),
  component: AboutPage,
})

function AboutPage() {
  return (
    <div>
      <PageHeader
        eyebrow="03 / About"
        title="Build with intent."
        description="I care about the whole path: the interface someone touches, the API behind it, and the infrastructure that keeps it running."
      />

      <div className="mt-14 grid gap-12 border-t border-line pt-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <div className="relative aspect-square w-full max-w-[320px] overflow-hidden border border-line bg-surface/60">
            <Avatar
              alt="Gopendranath Sasmal’s GitHub avatar"
              className="size-full"
              sizes="320px"
            />
            <span className="absolute left-4 top-4 border border-line bg-canvas/85 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
              Portfolio / 2026
            </span>
          </div>
          <div className="mt-5">
            <p
              className="text-2xl font-medium tracking-[-0.03em] text-ink"
              translate="no"
            >
              {profile.name}
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
              {profile.role}
            </p>
          </div>
          <div className="mt-6 space-y-3">
            <p className="flex items-start gap-2 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-muted">
              <MapPinIcon className="mt-0.5 size-3.5 shrink-0" />
              {profile.location}
            </p>
            <StatusBadge label={profile.availability} />
          </div>
        </div>

        <div className="space-y-6 text-base leading-relaxed text-muted sm:text-lg">
          {profile.about.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>

      <section
        aria-label="Technical stack"
        className="mt-20 border-t border-line pt-10"
      >
        <SectionLabel>Stack</SectionLabel>
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          {profile.stack.map((group) => (
            <div key={group.title}>
              <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                {group.title}
              </h2>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="border border-line bg-surface/60 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-label="Working principles"
        className="mt-20 border-t border-line pt-10"
      >
        <SectionLabel>How I work</SectionLabel>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {principles.map((principle, index) => (
            <div key={principle.title} className="border-l border-line pl-5">
              <span className="font-mono text-[9px] tracking-[0.18em] text-muted">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h2 className="mt-4 text-lg font-medium text-ink">
                {principle.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {principle.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-20 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
        <DownloadIcon className="size-3.5" />
        Resume PDF coming soon.
      </p>
    </div>
  )
}
