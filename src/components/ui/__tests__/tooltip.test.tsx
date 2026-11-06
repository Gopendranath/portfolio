import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
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

it('positions to the right when requested', async () => {
  const user = userEvent.setup()
  render(
    <Tooltip label="GitHub" placement="right">
      <TooltipTrigger type="button">GH</TooltipTrigger>
    </Tooltip>,
  )

  const trigger = screen.getByRole('button', { name: 'GH' })
  const wrapper = trigger.parentElement as HTMLSpanElement

  vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({
    x: 10,
    y: 100,
    top: 100,
    left: 10,
    right: 46,
    bottom: 136,
    width: 36,
    height: 36,
    toJSON: () => ({}),
  } as DOMRect)

  await user.hover(trigger)
  const tooltip = await screen.findByRole('tooltip')

  expect(tooltip).toHaveStyle({ left: '54px', top: '118px' })
})
