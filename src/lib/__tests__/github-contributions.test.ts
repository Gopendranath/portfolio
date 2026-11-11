import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContributionDay } from '@/lib/github'
import {
  fetchGithubContributions,
  formatContributionDate,
  GITHUB_CONTRIBUTIONS_FALLBACK,
  getMonthLabels,
  groupContributionsIntoWeeks,
  toGithubContributions,
} from '@/lib/github'

afterEach(() => {
  vi.unstubAllGlobals()
})

function makeDay(date: string, count = 0): ContributionDay {
  return { date, count, level: 0 }
}

describe('toGithubContributions', () => {
  it('maps the API total and daily contributions', () => {
    const contributions = toGithubContributions({
      total: { lastYear: 12 },
      contributions: [{ date: '2026-01-01', count: 3, level: 2 }],
    })

    expect(contributions).toEqual({
      total: 12,
      days: [{ date: '2026-01-01', count: 3, level: 2 }],
    })
  })
})

describe('GITHUB_CONTRIBUTIONS_FALLBACK', () => {
  it('contains a verified year of real contribution data', () => {
    const days = GITHUB_CONTRIBUTIONS_FALLBACK.days

    expect(GITHUB_CONTRIBUTIONS_FALLBACK.total).toBe(778)
    expect(days).toHaveLength(370)
    expect(days[0]).toEqual({ date: '2025-11-02', count: 0, level: 0 })
    expect(days.at(-1)).toEqual({ date: '2026-11-06', count: 0, level: 0 })
    expect(days.reduce((total, day) => total + day.count, 0)).toBe(778)
    expect(groupContributionsIntoWeeks(days)).toHaveLength(53)
  })
})

describe('groupContributionsIntoWeeks', () => {
  it('pads partial weeks starting on Sunday', () => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(Date.UTC(2025, 10, 3 + index))
        .toISOString()
        .slice(0, 10)
      return makeDay(date)
    })

    const weeks = groupContributionsIntoWeeks(days)

    expect(weeks).toHaveLength(2)
    expect(weeks[0]?.days.map((day) => day?.date ?? null)).toEqual([
      null,
      '2025-11-03',
      '2025-11-04',
      '2025-11-05',
      '2025-11-06',
      '2025-11-07',
      '2025-11-08',
    ])
    expect(weeks[1]?.days.map((day) => day?.date ?? null)).toEqual([
      '2025-11-09',
      null,
      null,
      null,
      null,
      null,
      null,
    ])
  })

  it('returns no weeks for empty data', () => {
    expect(groupContributionsIntoWeeks([])).toEqual([])
  })
})

describe('getMonthLabels', () => {
  it('labels the first week and each week containing a month start', () => {
    const days = Array.from({ length: 35 }, (_, index) => {
      const date = new Date(Date.UTC(2025, 10, 2 + index))
        .toISOString()
        .slice(0, 10)
      return makeDay(date)
    })

    expect(getMonthLabels(groupContributionsIntoWeeks(days))).toEqual([
      'Nov',
      null,
      null,
      null,
      'Dec',
    ])
  })
})

describe('formatContributionDate', () => {
  it('formats a date key without timezone drift', () => {
    expect(formatContributionDate('2026-10-08')).toBe('Thu, Oct 8, 2026')
  })
})

describe('fetchGithubContributions', () => {
  it('requests the public contributions API for the configured user', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total: { lastYear: 4 },
        contributions: [{ date: '2026-01-01', count: 4, level: 3 }],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const contributions = await fetchGithubContributions()

    expect(contributions).toEqual({
      total: 4,
      days: [{ date: '2026-01-01', count: 4, level: 3 }],
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://github-contributions-api.jogruber.de/v4/Gopendranath?y=last',
      { signal: undefined, headers: { Accept: 'application/json' } },
    )
  })

  it('throws when the contributions API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    )

    await expect(fetchGithubContributions()).rejects.toThrow(
      'GitHub contributions request failed with status 503',
    )
  })
})
