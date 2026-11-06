import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { SocialLinks } from '../social-links'

it('shows custom tooltips for icon-only social links', async () => {
  const user = userEvent.setup()
  render(<SocialLinks />)

  const github = screen.getByRole('link', { name: 'GitHub' })

  expect(github).not.toHaveAttribute('title')

  await user.hover(github)

  expect(await screen.findByRole('tooltip')).toHaveTextContent('GitHub')
})

it('shows custom tooltips for labeled social links', async () => {
  const user = userEvent.setup()
  render(<SocialLinks showLabels />)

  const github = screen.getByRole('link', { name: 'GitHub' })

  expect(github).not.toHaveAttribute('title')

  await user.hover(github)

  expect(await screen.findByRole('tooltip')).toHaveTextContent('GitHub')
})
