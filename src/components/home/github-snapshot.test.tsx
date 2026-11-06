import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { GithubSnapshot } from './github-snapshot'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('renders the verified static fallback when GitHub is unavailable', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('GitHub unavailable')),
  )

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <GithubSnapshot />
    </QueryClientProvider>,
  )

  expect(
    await screen.findByText('Static snapshot', undefined, { timeout: 4000 }),
  ).toBeInTheDocument()
  expect(screen.getByText('75')).toBeInTheDocument()
  expect(screen.getByText('12')).toBeInTheDocument()
  expect(screen.getByText('29')).toBeInTheDocument()
  expect(screen.getByText('Public repos')).toBeInTheDocument()
  expect(screen.getByText('Followers')).toBeInTheDocument()
  expect(screen.getByText('Stars')).toBeInTheDocument()
})

it('announces snapshot source changes to screen readers', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('GitHub unavailable')),
  )

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <GithubSnapshot />
    </QueryClientProvider>,
  )

  expect(await screen.findByRole('status')).toBeInTheDocument()
})
