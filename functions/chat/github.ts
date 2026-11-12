import { ApiError } from './errors'

const DAY_MS = 24 * 60 * 60 * 1000
const CACHE_TTL_MS = 7 * DAY_MS

export interface GitHubProfile {
  login: string
  createdAt: Date
}

export interface CachedGitHubProfile {
  login: string | null
  createdAt: Date | null
  checkedAt: Date | null
}

export type AiReason =
  | 'owner'
  | 'eligible'
  | 'account_too_new'
  | 'github_check_unavailable'

export interface AiAccess {
  eligible: boolean
  reason: AiReason
}

type Fetcher = () => Promise<GitHubProfile>

export function isAiEligible(
  createdAt: Date | null,
  now = new Date(),
): boolean {
  if (!createdAt) {
    return false
  }

  return createdAt.getTime() <= now.getTime() - 365 * DAY_MS
}

export function getAiAccess(input: {
  createdAt: Date | null
  isOwner: boolean
  now?: Date
}): AiAccess {
  const now = input.now ?? new Date()

  if (input.isOwner) {
    return { eligible: true, reason: 'owner' }
  }

  if (!input.createdAt) {
    return { eligible: false, reason: 'github_check_unavailable' }
  }

  return isAiEligible(input.createdAt, now)
    ? { eligible: true, reason: 'eligible' }
    : { eligible: false, reason: 'account_too_new' }
}

export function isOwnerGithubId(githubId: string): boolean {
  return githubId === (process.env.OWNER_GITHUB_ID ?? '71755844')
}

export function isCacheFresh(
  cached: CachedGitHubProfile,
  now = new Date(),
): boolean {
  if (!cached.checkedAt || !cached.createdAt) {
    return false
  }

  return now.getTime() - cached.checkedAt.getTime() < CACHE_TTL_MS
}

export async function fetchGitHubProfile(
  githubId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GitHubProfile> {
  const response = await fetchImpl(
    `https://api.github.com/user/${encodeURIComponent(githubId)}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'portfolio-chat',
      },
      cache: 'no-store',
    },
  )

  if (!response.ok) {
    throw new ApiError(
      'UPSTREAM_ERROR',
      'Could not verify the GitHub account',
      502,
      true,
    )
  }

  const data = (await response.json()) as {
    login?: unknown
    created_at?: unknown
  }

  if (typeof data.login !== 'string' || typeof data.created_at !== 'string') {
    throw new ApiError(
      'UPSTREAM_ERROR',
      'GitHub returned an unexpected profile',
      502,
      true,
    )
  }

  const createdAt = new Date(data.created_at)
  if (Number.isNaN(createdAt.getTime())) {
    throw new ApiError(
      'UPSTREAM_ERROR',
      'GitHub returned an invalid creation date',
      502,
      true,
    )
  }

  return { login: data.login, createdAt }
}

export async function resolveGitHubProfile(
  cached: CachedGitHubProfile,
  fetcher: Fetcher,
  now = new Date(),
): Promise<{
  profile: GitHubProfile
  source: 'cache' | 'network' | 'stale'
}> {
  if (isCacheFresh(cached, now) && cached.createdAt) {
    return {
      profile: {
        login: cached.login ?? 'unknown',
        createdAt: cached.createdAt,
      },
      source: 'cache',
    }
  }

  try {
    return { profile: await fetcher(), source: 'network' }
  } catch (error) {
    if (cached.createdAt) {
      return {
        profile: {
          login: cached.login ?? 'unknown',
          createdAt: cached.createdAt,
        },
        source: 'stale',
      }
    }
    throw error
  }
}
