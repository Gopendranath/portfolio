import { createFileRoute } from '@tanstack/react-router'
import { FactList } from '@/components/ui/fact-list'
import { ArrowRightIcon, DownloadIcon } from '@/components/ui/icons'
import { PageHeader } from '@/components/ui/page-header'
import { SectionLabel } from '@/components/ui/section-label'
import { SocialLinks } from '@/components/ui/social-links'
import { StatusBadge } from '@/components/ui/status-badge'
import { pageMeta } from '@/data/pages'
import { profile } from '@/data/profile'
import { pageHead } from '@/lib/seo'

export const Route = createFileRoute('/contact')({
  head: () =>
    pageHead(
      pageMeta.contact.title,
      pageMeta.contact.description,
      pageMeta.contact.path,
    ),
  component: ContactPage,
})

function ContactPage() {
  return (
    <div>
      <PageHeader
        eyebrow="04 / Contact"
        title="Let’s build something."
        description="I’m open to full-stack roles and product collaborations. The fastest way to reach me is email."
      />

      <div className="mt-14 grid gap-12 border-t border-line pt-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <a
            href={`mailto:${profile.email}`}
            translate="no"
            className="block text-[clamp(1.65rem,4vw,3.2rem)] font-medium leading-tight tracking-[-0.035em] text-ink transition-colors hover:text-accent"
          >
            <span className="block">gopendranathsasmal7</span>
            <span className="block">@gmail.com</span>
          </a>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a
              href={`mailto:${profile.email}`}
              className="group inline-flex items-center gap-2 bg-accent px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-ink transition-colors hover:bg-ink"
            >
              Send an email
              <ArrowRightIcon className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-1" />
            </a>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="inline-flex items-center gap-2 border border-line px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted opacity-60"
            >
              Resume — coming soon
              <DownloadIcon className="size-4" />
            </button>
          </div>

          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted">
            Based in Bengaluru and working across time zones. Email is the best
            way to start a conversation.
          </p>
        </div>

        <div className="space-y-10">
          <div>
            <SectionLabel>Elsewhere</SectionLabel>
            <SocialLinks showLabels className="mt-4 -ml-2" />
          </div>

          <div>
            <SectionLabel>Details</SectionLabel>
            <FactList
              className="mt-4"
              items={[
                { label: 'Location', value: profile.location },
                { label: 'Timezone', value: profile.timezone },
                {
                  label: 'Status',
                  value: <StatusBadge label={profile.availability} />,
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
