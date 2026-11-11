import { queryOptions } from '@tanstack/react-query'
import { fetchGithubJson, GITHUB_API, GITHUB_USERNAME } from './client'

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

export async function fetchGithubSnapshot(
  signal?: AbortSignal,
): Promise<GithubSnapshot> {
  const [user, repos] = await Promise.all([
    fetchGithubJson<GithubUserResponse>(
      `${GITHUB_API}/users/${GITHUB_USERNAME}`,
      signal,
    ),
    fetchGithubJson<GithubRepoResponse[]>(
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
