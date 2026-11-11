export const GITHUB_USERNAME = 'Gopendranath'
export const GITHUB_API = 'https://api.github.com'

export async function fetchGithubJson<T>(
  url: string,
  signal?: AbortSignal,
  accept = 'application/vnd.github+json',
  resource = 'GitHub request',
): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: accept } })

  if (!response.ok) {
    throw new Error(`${resource} failed with status ${response.status}`)
  }

  return (await response.json()) as T
}
