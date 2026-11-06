import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { GithubSnapshot } from './github-snapshot'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('renders the verified fallback when GitHub is unavailable', () => {
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

  expect(screen.getByText('75')).toBeInTheDocument()
  expect(screen.getByText('12')).toBeInTheDocument()
  expect(screen.getByText('29')).toBeInTheDocument()
  expect(screen.getByText('Public repos')).toBeInTheDocument()
  expect(screen.getByText('Followers')).toBeInTheDocument()
  expect(screen.getByText('Stars')).toBeInTheDocument()
})
