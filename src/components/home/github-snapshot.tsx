import { useQuery } from '@tanstack/react-query'
import { GITHUB_FALLBACK, githubSnapshotQuery } from '../../lib/github'
import { ExternalLink } from '../ui/external-link'
import { SectionLabel } from '../ui/section-label'

interface SnapshotStatProps {
  label: string
  value: number
}

function SnapshotStat({ label, value }: SnapshotStatProps) {
  return (
    <div>
      <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>
      <dd className="mt-2 font-mono text-2xl tracking-[-0.04em] text-ink sm:text-3xl">
        {value}
      </dd>
    </div>
  )
}

export function GithubSnapshot() {
  const { data, isFetching, isPlaceholderData } = useQuery(githubSnapshotQuery)
  const snapshot = data ?? GITHUB_FALLBACK
  const sourceLabel = isFetching
    ? 'Syncing'
    : isPlaceholderData
      ? 'Cached snapshot'
      : 'Live from GitHub'

  return (
    <section
      aria-label="GitHub snapshot"
      className="border border-line bg-surface/60 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionLabel className="min-w-[10rem] flex-1">
          GitHub snapshot
        </SectionLabel>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
          {sourceLabel}
        </span>
      </div>

      <dl className="mt-8 grid grid-cols-3 gap-3">
        <SnapshotStat label="Public repos" value={snapshot.publicRepos} />
        <SnapshotStat label="Followers" value={snapshot.followers} />
        <SnapshotStat label="Stars" value={snapshot.totalStars} />
      </dl>

      <div className="mt-6 border-t border-line pt-4">
        <ExternalLink
          href="https://github.com/Gopendranath"
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-accent"
        >
          View GitHub profile
        </ExternalLink>
      </div>
    </section>
  )
}
