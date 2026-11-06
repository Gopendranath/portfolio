import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { Tooltip, TooltipTrigger } from '../tooltip'

it('shows on hover and focus, links the trigger, and closes on Escape', async () => {
  const user = userEvent.setup()
  render(
    <Tooltip label="Copy message">
      <TooltipTrigger type="button">Copy</TooltipTrigger>
    </Tooltip>,
  )

  const trigger = screen.getByRole('button', { name: 'Copy' })

  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

  await user.hover(trigger)
  const tooltip = await screen.findByRole('tooltip')

  expect(tooltip).toHaveTextContent('Copy message')
  expect(trigger).toHaveAttribute('aria-describedby', tooltip.id)

  await user.unhover(trigger)
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

  await user.tab()
  expect(await screen.findByRole('tooltip')).toBeInTheDocument()

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
})
