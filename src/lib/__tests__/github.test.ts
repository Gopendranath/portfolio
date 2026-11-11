import { describe, expect, it } from 'vitest'
import { GITHUB_FALLBACK, toGithubSnapshot } from '@/lib/github'

describe('toGithubSnapshot', () => {
  it('uses profile counts and sums stars from original repos only', () => {
    const snapshot = toGithubSnapshot({ public_repos: 7, followers: 3 }, [
      { fork: false, stargazers_count: 4 },
      { fork: false, stargazers_count: 2 },
      { fork: true, stargazers_count: 99 },
    ])

    expect(snapshot).toEqual({
      publicRepos: 7,
      followers: 3,
      totalStars: 6,
    })
  })
})

describe('GITHUB_FALLBACK', () => {
  it('matches the verified 2026-11-06 snapshot', () => {
    expect(GITHUB_FALLBACK).toEqual({
      publicRepos: 75,
      followers: 12,
      totalStars: 29,
    })
  })
})
