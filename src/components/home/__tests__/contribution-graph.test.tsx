import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { ContributionGraph } from '../contribution-graph'

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderGraph() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ContributionGraph />
    </QueryClientProvider>,
  )
}

it('renders the verified static fallback when the contributions API fails', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('Contributions unavailable')),
  )

  renderGraph()

  expect(
    await screen.findByText('Static snapshot', undefined, { timeout: 4000 }),
  ).toBeInTheDocument()
  expect(screen.getByText('778')).toBeInTheDocument()
  expect(screen.getByText('contributions in the last year')).toBeInTheDocument()
  expect(
    screen.getByRole('group', {
      name: /GitHub contribution heatmap for the last 12 months/i,
    }),
  ).toBeInTheDocument()
  expect(screen.getByText('Less')).toBeInTheDocument()
  expect(screen.getByText('More')).toBeInTheDocument()
})

it('shows a day tooltip with the contribution count and date', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('Contributions unavailable')),
  )
  const user = userEvent.setup()

  renderGraph()

  const cell = screen.getByRole('button', {
    name: '20 contributions on Thu, Oct 8, 2026',
  })
  await user.hover(cell)

  expect(await screen.findByRole('tooltip')).toHaveTextContent(
    '20 contributions on Thu, Oct 8, 2026',
  )
})

it('moves day focus with arrow keys and keeps one tab stop', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('Contributions unavailable')),
  )
  const user = userEvent.setup()

  renderGraph()

  const firstDay = screen.getByRole('button', {
    name: '0 contributions on Sun, Nov 2, 2025',
  })
  const secondDay = screen.getByRole('button', {
    name: '0 contributions on Mon, Nov 3, 2025',
  })

  expect(firstDay).toHaveAttribute('tabindex', '0')
  expect(secondDay).toHaveAttribute('tabindex', '-1')

  firstDay.focus()
  await user.keyboard('{ArrowRight}')

  expect(
    screen.getByRole('button', {
      name: '0 contributions on Sun, Nov 9, 2025',
    }),
  ).toHaveFocus()

  await user.keyboard('{ArrowDown}')

  expect(
    screen.getByRole('button', {
      name: '2 contributions on Mon, Nov 10, 2025',
    }),
  ).toHaveFocus()
})

it('renders live contributions when the API succeeds', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total: { lastYear: 3 },
        contributions: [
          { date: '2026-11-02', count: 1, level: 1 },
          { date: '2026-11-03', count: 2, level: 2 },
        ],
      }),
    }),
  )

  renderGraph()

  expect(
    await screen.findByText('Live from GitHub', undefined, { timeout: 4000 }),
  ).toBeInTheDocument()
  expect(screen.getByText('3')).toBeInTheDocument()
})
