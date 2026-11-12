import { describe, expect, it, vi } from 'vitest'
import {
  fetchGitHubProfile,
  getAiAccess,
  isAiEligible,
  isCacheFresh,
  isOwnerGithubId,
  resolveGitHubProfile,
} from '../chat/github'

const DAY_MS = 24 * 60 * 60 * 1000
const now = new Date('2026-11-12T00:00:00Z')

describe('isAiEligible', () => {
  it('allows an account created 366 days ago', () => {
    expect(isAiEligible(new Date(now.getTime() - 366 * DAY_MS), now)).toBe(true)
  })

  it('rejects an account created 364 days ago', () => {
    expect(isAiEligible(new Date(now.getTime() - 364 * DAY_MS), now)).toBe(
      false,
    )
  })

  it('allows an account created exactly 365 days ago', () => {
    expect(isAiEligible(new Date(now.getTime() - 365 * DAY_MS), now)).toBe(true)
  })

  it('rejects an unknown creation date', () => {
    expect(isAiEligible(null, now)).toBe(false)
  })
})

describe('getAiAccess', () => {
  it('lets the owner bypass the age gate', () => {
    expect(
      getAiAccess({
        createdAt: new Date(now.getTime() - DAY_MS),
        isOwner: true,
        now,
      }),
    ).toEqual({ eligible: true, reason: 'owner' })
  })

  it('reports account_too_new', () => {
    expect(
      getAiAccess({
        createdAt: new Date(now.getTime() - 30 * DAY_MS),
        isOwner: false,
        now,
      }),
    ).toEqual({ eligible: false, reason: 'account_too_new' })
  })

  it('reports github_check_unavailable when there is no date', () => {
    expect(getAiAccess({ createdAt: null, isOwner: false, now })).toEqual({
      eligible: false,
      reason: 'github_check_unavailable',
    })
  })
})

describe('isOwnerGithubId', () => {
  it('matches the configured owner id', () => {
    vi.stubEnv('OWNER_GITHUB_ID', '71755844')
    expect(isOwnerGithubId('71755844')).toBe(true)
    expect(isOwnerGithubId('123')).toBe(false)
  })
})

describe('cache freshness', () => {
  it('accepts a profile checked yesterday', () => {
    expect(
      isCacheFresh(
        {
          login: 'Gopendranath',
          createdAt: new Date(now.getTime() - 500 * DAY_MS),
          checkedAt: new Date(now.getTime() - DAY_MS),
        },
        now,
      ),
    ).toBe(true)
  })

  it('rejects a profile checked eight days ago', () => {
    expect(
      isCacheFresh(
        {
          login: 'Gopendranath',
          createdAt: new Date(now.getTime() - 500 * DAY_MS),
          checkedAt: new Date(now.getTime() - 8 * DAY_MS),
        },
        now,
      ),
    ).toBe(false)
  })
})

describe('resolveGitHubProfile', () => {
  const cached = {
    login: 'cached',
    createdAt: new Date(now.getTime() - 500 * DAY_MS),
    checkedAt: new Date(now.getTime() - 8 * DAY_MS),
  }

  it('uses a fresh cache without calling GitHub', async () => {
    const fetcher = vi.fn()
    const result = await resolveGitHubProfile(
      { ...cached, checkedAt: new Date(now.getTime() - DAY_MS) },
      fetcher,
      now,
    )
    expect(result.source).toBe('cache')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('refreshes a stale cache', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      login: 'fresh',
      createdAt: new Date(now.getTime() - 600 * DAY_MS),
    })
    const result = await resolveGitHubProfile(cached, fetcher, now)
    expect(result.source).toBe('network')
    expect(result.profile.login).toBe('fresh')
  })

  it('falls back to stale cache when GitHub fails', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('rate limited'))
    const result = await resolveGitHubProfile(cached, fetcher, now)
    expect(result.source).toBe('stale')
    expect(result.profile.login).toBe('cached')
  })

  it('rethrows when GitHub fails with no cache', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('rate limited'))
    await expect(
      resolveGitHubProfile(
        { login: null, createdAt: null, checkedAt: null },
        fetcher,
        now,
      ),
    ).rejects.toThrow('rate limited')
  })
})

describe('fetchGitHubProfile', () => {
  it('reads login and created_at', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          login: 'Gopendranath',
          created_at: '2020-09-23T07:56:50Z',
        }),
        { status: 200 },
      ),
    )

    await expect(fetchGitHubProfile('71755844', fetchImpl)).resolves.toEqual({
      login: 'Gopendranath',
      createdAt: new Date('2020-09-23T07:56:50Z'),
    })
  })

  it('rejects a non-OK response', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response('nope', { status: 404 }))
    await expect(fetchGitHubProfile('1', fetchImpl)).rejects.toMatchObject({
      code: 'UPSTREAM_ERROR',
    })
  })
})
