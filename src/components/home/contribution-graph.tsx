import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink } from '@/components/ui/external-link'
import { SectionLabel } from '@/components/ui/section-label'
import {
  GITHUB_CONTRIBUTIONS_FALLBACK,
  getMonthLabels,
  githubContributionsQuery,
  groupContributionsIntoWeeks,
} from '@/lib/github'
import { querySourceLabel } from '@/lib/query/status'
import { ContributionHeatmap } from './contribution-heatmap'

const numberFormat = new Intl.NumberFormat('en-US')

export function ContributionGraph() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const query = useQuery(githubContributionsQuery)
  const { isError, isFetching, isPlaceholderData } = query
  const contributions = query.data ?? GITHUB_CONTRIBUTIONS_FALLBACK
  const sourceLabel = querySourceLabel({
    isFetching,
    isError,
    isPlaceholderData,
    hasData: query.data !== undefined,
  })

  const weeks = useMemo(() => groupContributionsIntoWeeks(contributions.days), [contributions.days])
  const monthLabels = useMemo(() => getMonthLabels(weeks), [weeks])
  const lastMonthLabelIndex = monthLabels.findLastIndex((label) => label !== null)
  const dayIndexByDate = useMemo(
    () => new Map(contributions.days.map((day, index) => [day.date, index] as const)),
    [contributions.days],
  )
  const currentIndex = Math.min(activeIndex, contributions.days.length - 1)

  useEffect(() => {
    const node = scrollRef.current

    if (!node || contributions.days.length === 0) {
      return
    }

    node.scrollLeft = node.scrollWidth
  }, [contributions.days])

  return (
    <section aria-label="Contribution activity">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionLabel className="min-w-[10rem] flex-1">Contribution activity</SectionLabel>
        <span role="status" className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
          {sourceLabel}
        </span>
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-4xl tabular-nums tracking-[-0.04em] text-ink sm:text-5xl">
            {numberFormat.format(contributions.total)}
          </p>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            contributions in the last year
          </p>
        </div>
        <ExternalLink
          href="https://github.com/Gopendranath"
          className="group font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-accent"
        >
          View GitHub activity
        </ExternalLink>
      </div>

      <div ref={scrollRef} className="mt-8 overflow-x-auto overscroll-x-contain pb-2">
        <div className="min-w-[640px]">
          <ContributionHeatmap
            total={contributions.total}
            weeks={weeks}
            monthLabels={monthLabels}
            lastMonthLabelIndex={lastMonthLabelIndex}
            days={contributions.days}
            dayIndexByDate={dayIndexByDate}
            activeIndex={currentIndex}
            onActiveIndexChange={setActiveIndex}
          />
        </div>
      </div>
    </section>
  )
}
