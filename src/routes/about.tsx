import { createFileRoute } from '@tanstack/react-router'
import { DownloadIcon, MapPinIcon } from '@/components/ui/icons'
import { PageHeader } from '@/components/ui/page-header'
import { PageSection } from '@/components/ui/page-section'
import { StackTags } from '@/components/ui/stack-tags'
import { StatusBadge } from '@/components/ui/status-badge'
import { principles } from '@/data/about'
import { pageMeta } from '@/data/pages'
import { profile } from '@/data/profile'
import { PortraitRipple } from '@/features/portrait-ripple'
import { pageHead } from '@/lib/seo'

export const Route = createFileRoute('/about')({
  head: () =>
    pageHead(
      pageMeta.about.title,
      pageMeta.about.description,
      pageMeta.about.path,
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
          <PortraitRipple alt="Gopendranath Sasmal’s GitHub avatar" />
          <div className="cursor-target mt-5 w-fit">
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
            <a
              href={profile.locationUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="cursor-target flex w-fit items-center gap-2 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-muted transition-colors hover:text-accent"
            >
              <MapPinIcon className="size-3.5 shrink-0" />
              {profile.location}
            </a>
            <StatusBadge
              iconClassName="size-3.5"
              label={profile.availability}
            />
          </div>
        </div>

        <div className="space-y-6 text-base leading-relaxed text-muted sm:text-lg">
          {profile.about.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>

      <PageSection label="Stack" ariaLabel="Technical stack">
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          {profile.stack.map((group) => (
            <div key={group.title}>
              <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                {group.title}
              </h2>
              <StackTags items={group.items} className="mt-4" hover />
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection label="How I work" ariaLabel="Working principles">
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {principles.map((principle, index) => (
            <div
              key={principle.title}
              className="cursor-target border-l border-line pl-5"
            >
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
      </PageSection>

      <p className="mt-20 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
        <DownloadIcon className="size-3.5" />
        Resume PDF coming soon.
      </p>
    </div>
  )
}
