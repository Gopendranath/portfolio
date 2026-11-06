import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  GITHUB_CONTRIBUTIONS_FALLBACK,
  formatContributionDate,
  getMonthLabels,
  githubContributionsQuery,
  groupContributionsIntoWeeks,
} from '../../lib/github-contributions'
import type {
  ContributionLevel,
  ContributionWeek,
} from '../../lib/github-contributions'
import { ExternalLink } from '../ui/external-link'
import { SectionLabel } from '../ui/section-label'
import { Tooltip, TooltipTrigger } from '../ui/tooltip'

const numberFormat = new Intl.NumberFormat('en-US')

const levelClasses: Record<ContributionLevel, string> = {
  0: 'bg-line/35',
  1: 'bg-accent/20',
  2: 'bg-accent/40',
  3: 'bg-accent/65',
  4: 'bg-accent',
}

const weekdayRows = [
  { id: 'sun', label: '' },
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: '' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: '' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: '' },
] as const

function getWeekKey(week: ContributionWeek) {
  return week.days.find((day) => day !== null)?.date ?? 'empty-week'
}

export function ContributionGraph() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const { data, isError, isFetching, isPlaceholderData } = useQuery(
    githubContributionsQuery,
  )
  const contributions = data ?? GITHUB_CONTRIBUTIONS_FALLBACK
  const hasFetchedData =
    data !== undefined && data !== GITHUB_CONTRIBUTIONS_FALLBACK
  const sourceLabel = isFetching
    ? 'Syncing…'
    : isError
      ? hasFetchedData
        ? 'Cached GitHub data'
        : 'Static snapshot'
      : isPlaceholderData
        ? 'Cached snapshot'
        : 'Live from GitHub'

  const weeks = useMemo(
    () => groupContributionsIntoWeeks(contributions.days),
    [contributions.days],
  )
  const monthLabels = useMemo(() => getMonthLabels(weeks), [weeks])
  const lastMonthLabelIndex = monthLabels.findLastIndex(
    (label) => label !== null,
  )
  const dayIndexByDate = useMemo(
    () =>
      new Map(
        contributions.days.map((day, index) => [day.date, index] as const),
      ),
    [contributions.days],
  )
  const lastIndex = contributions.days.length - 1
  const currentIndex = Math.min(activeIndex, lastIndex)

  useEffect(() => {
    const node = scrollRef.current

    if (!node || contributions.days.length === 0) {
      return
    }

    node.scrollLeft = node.scrollWidth
  }, [contributions.days])

  function handleKeyDown(event: KeyboardEvent<HTMLFieldSetElement>) {
    if (!(event.target instanceof HTMLButtonElement)) {
      return
    }

    const date = event.target.dataset.date

    if (!date) {
      return
    }

    const index = dayIndexByDate.get(date)

    if (index === undefined) {
      return
    }

    let nextIndex = index

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = Math.min(index + 7, lastIndex)
        break
      case 'ArrowLeft':
        nextIndex = Math.max(index - 7, 0)
        break
      case 'ArrowDown':
        nextIndex = Math.min(index + 1, lastIndex)
        break
      case 'ArrowUp':
        nextIndex = Math.max(index - 1, 0)
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = lastIndex
        break
      default:
        return
    }

    event.preventDefault()
    setActiveIndex(nextIndex)

    const nextDay = contributions.days[nextIndex]
    const nextCell = event.currentTarget.querySelector<HTMLButtonElement>(
      `[data-date="${nextDay?.date}"]`,
    )
    nextCell?.focus()
  }

  return (
    <section
      aria-label="Contribution activity"
      className="border-t border-line pt-10"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionLabel className="min-w-[10rem] flex-1">
          Contribution activity
        </SectionLabel>
        <span
          role="status"
          className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted"
        >
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

      <div
        ref={scrollRef}
        className="mt-8 overflow-x-auto overscroll-x-contain pb-2"
      >
        <div className="min-w-[640px]">
          <fieldset
            aria-label={`GitHub contribution heatmap for the last 12 months. ${contributions.total} contributions.`}
            onKeyDown={handleKeyDown}
            className="m-0 min-w-0 border-0 p-0"
          >
            <div className="flex gap-[3px] pl-8" aria-hidden="true">
              {weeks.map((week, weekIndex) => (
                <div
                  key={getWeekKey(week)}
                  className="relative h-3.5 min-w-0 flex-1"
                >
                  {monthLabels[weekIndex] ? (
                    <span
                      className={`whitespace-nowrap font-mono text-[8px] uppercase tracking-[0.12em] text-muted ${
                        weekIndex === lastMonthLabelIndex
                          ? 'absolute right-0 top-0'
                          : 'block'
                      }`}
                    >
                      {monthLabels[weekIndex]}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-1 flex gap-3">
              <div
                className="grid w-5 shrink-0 gap-[3px] font-mono text-[8px] uppercase tracking-[0.1em] text-muted"
                style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}
                aria-hidden="true"
              >
                {weekdayRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-end leading-none"
                  >
                    {row.label}
                  </div>
                ))}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                {weekdayRows.map((row, rowIndex) => (
                  <div key={row.id} className="flex gap-[3px]">
                    {weeks.map((week) => {
                      const day = week.days[rowIndex]

                      if (!day) {
                        return (
                          <div
                            key={`${getWeekKey(week)}-${row.id}`}
                            className="min-w-0 flex-1"
                            aria-hidden="true"
                          >
                            <div className="aspect-square" />
                          </div>
                        )
                      }

                      const index = dayIndexByDate.get(day.date) ?? 0
                      const label = `${day.count} ${
                        day.count === 1 ? 'contribution' : 'contributions'
                      } on ${formatContributionDate(day.date)}`

                      return (
                        <Tooltip
                          key={day.date}
                          label={label}
                          placement="top"
                          className="min-w-0 flex-1"
                        >
                          <TooltipTrigger
                            type="button"
                            aria-label={label}
                            data-date={day.date}
                            tabIndex={index === currentIndex ? 0 : -1}
                            onFocus={() => setActiveIndex(index)}
                            className={`aspect-square w-full border border-line/50 transition-colors hover:border-ink focus-visible:border-ink ${levelClasses[day.level]}`}
                          />
                        </Tooltip>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </fieldset>

          <div className="mt-3 flex items-center justify-end gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
            <span>Less</span>
            <div className="flex gap-1" aria-hidden="true">
              {([0, 1, 2, 3, 4] as const).map((level) => (
                <span
                  key={level}
                  className={`size-2.5 border border-line/50 ${levelClasses[level]}`}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </section>
  )
}
