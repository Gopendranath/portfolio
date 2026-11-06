import { queryOptions } from '@tanstack/react-query'

export interface GithubSnapshot {
  publicRepos: number
  followers: number
  totalStars: number
}

interface GithubUserResponse {
  public_repos: number
  followers: number
}

interface GithubRepoResponse {
  fork: boolean
  stargazers_count: number
}

export const GITHUB_USERNAME = 'Gopendranath'
const GITHUB_API = 'https://api.github.com'

export const GITHUB_FALLBACK: GithubSnapshot = {
  publicRepos: 75,
  followers: 12,
  totalStars: 29,
}

export function toGithubSnapshot(
  user: Pick<GithubUserResponse, 'public_repos' | 'followers'>,
  repos: readonly Pick<GithubRepoResponse, 'fork' | 'stargazers_count'>[],
): GithubSnapshot {
  const totalStars = repos
    .filter((repo) => !repo.fork)
    .reduce((total, repo) => total + repo.stargazers_count, 0)

  return {
    publicRepos: user.public_repos,
    followers: user.followers,
    totalStars,
  }
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/vnd.github+json' },
  })

  if (!response.ok) {
    throw new Error(`GitHub request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}

export async function fetchGithubSnapshot(
  signal?: AbortSignal,
): Promise<GithubSnapshot> {
  const [user, repos] = await Promise.all([
    getJson<GithubUserResponse>(
      `${GITHUB_API}/users/${GITHUB_USERNAME}`,
      signal,
    ),
    getJson<GithubRepoResponse[]>(
      `${GITHUB_API}/users/${GITHUB_USERNAME}/repos?per_page=100&type=owner`,
      signal,
    ),
  ])

  return toGithubSnapshot(user, repos)
}

export const githubSnapshotQuery = queryOptions<GithubSnapshot>({
  queryKey: ['github', 'snapshot', GITHUB_USERNAME],
  queryFn: ({ signal }) => fetchGithubSnapshot(signal),
  staleTime: 30 * 60_000,
  retry: 1,
  placeholderData: GITHUB_FALLBACK,
})
