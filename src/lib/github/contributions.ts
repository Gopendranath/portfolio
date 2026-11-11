import { queryOptions } from '@tanstack/react-query'
import { fetchGithubJson, GITHUB_USERNAME } from './client'
import {
  GITHUB_CONTRIBUTIONS_FALLBACK_DAYS,
  GITHUB_CONTRIBUTIONS_FALLBACK_TOTAL,
} from './contributions-fallback'

export type ContributionLevel = 0 | 1 | 2 | 3 | 4

export interface ContributionDay {
  date: string
  count: number
  level: ContributionLevel
}

export interface GithubContributions {
  total: number
  days: readonly ContributionDay[]
}

export interface ContributionWeek {
  days: readonly (ContributionDay | null)[]
}

interface GithubContributionsResponse {
  total: { lastYear: number }
  contributions: Array<{
    date: string
    count: number
    level: number
  }>
}

const GITHUB_CONTRIBUTIONS_API =
  'https://github-contributions-api.jogruber.de/v4'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})

function toLevel(level: number): ContributionLevel {
  if (level <= 0) {
    return 0
  }

  if (level >= 4) {
    return 4
  }

  return level as ContributionLevel
}

function parseDateKey(date: string) {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function formatContributionDate(date: string) {
  return dateFormatter.format(parseDateKey(date))
}

export function toGithubContributions(
  response: GithubContributionsResponse,
): GithubContributions {
  return {
    total: response.total.lastYear,
    days: response.contributions.map((day) => ({
      date: day.date,
      count: day.count,
      level: toLevel(day.level),
    })),
  }
}

export function groupContributionsIntoWeeks(
  days: readonly ContributionDay[],
): ContributionWeek[] {
  if (days.length === 0) {
    return []
  }

  const weeks: Array<Array<ContributionDay | null>> = []
  let week: Array<ContributionDay | null> = []
  const firstDay = days[0]
  const leadingDays = firstDay ? parseDateKey(firstDay.date).getUTCDay() : 0

  for (let index = 0; index < leadingDays; index += 1) {
    week.push(null)
  }

  for (const day of days) {
    week.push(day)

    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }

  if (week.length > 0) {
    while (week.length < 7) {
      week.push(null)
    }

    weeks.push(week)
  }

  return weeks.map((days) => ({ days }))
}

export function getMonthLabels(
  weeks: readonly ContributionWeek[],
): Array<string | null> {
  let lastMonth = -1

  return weeks.map((week) => {
    const monthStart = week.days.find((day) => day?.date.endsWith('-01'))
    const day = monthStart ?? week.days.find((entry) => entry !== null)

    if (!day) {
      return null
    }

    const date = parseDateKey(day.date)
    const month = date.getUTCMonth()

    if (month === lastMonth) {
      return null
    }

    lastMonth = month
    return monthFormatter.format(date)
  })
}

export async function fetchGithubContributions(
  signal?: AbortSignal,
): Promise<GithubContributions> {
  return toGithubContributions(
    await fetchGithubJson<GithubContributionsResponse>(
      `${GITHUB_CONTRIBUTIONS_API}/${GITHUB_USERNAME}?y=last`,
      signal,
      'application/json',
      'GitHub contributions request',
    ),
  )
}

export const GITHUB_CONTRIBUTIONS_FALLBACK: GithubContributions = {
  total: GITHUB_CONTRIBUTIONS_FALLBACK_TOTAL,
  days: GITHUB_CONTRIBUTIONS_FALLBACK_DAYS.map(([date, count, level]) => ({
    date,
    count,
    level: toLevel(level),
  })),
}

export const githubContributionsQuery = queryOptions<GithubContributions>({
  queryKey: ['github', 'contributions', GITHUB_USERNAME],
  queryFn: ({ signal }) => fetchGithubContributions(signal),
  staleTime: 60 * 60_000,
  retry: 1,
  placeholderData: GITHUB_CONTRIBUTIONS_FALLBACK,
})
