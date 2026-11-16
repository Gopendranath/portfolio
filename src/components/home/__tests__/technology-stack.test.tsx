import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { TechnologyStack } from '@/components/home/technology-stack'

it('renders the core technology list and a working pause control', async () => {
  const user = userEvent.setup()
  const { container } = render(<TechnologyStack />)
  const marquee = container.querySelector('.technology-marquee')

  expect(screen.getByRole('region', { name: 'Technology stack' })).toBeInTheDocument()

  const list = screen.getByRole('list')
  expect(within(list).getAllByRole('listitem')).toHaveLength(12)
  expect(within(list).getByText('React')).toBeInTheDocument()
  expect(marquee).toHaveAttribute('data-paused', 'false')

  await user.click(screen.getByRole('button', { name: 'Pause' }))
  expect(marquee).toHaveAttribute('data-paused', 'true')
  expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
})
