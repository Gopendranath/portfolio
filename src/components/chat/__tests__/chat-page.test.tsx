import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ChatPage } from '../../../routes/chat'

it('defers the chat height to the layout shell', () => {
  const { container } = render(<ChatPage />)
  const page = container.firstElementChild

  expect(page).toHaveClass('min-h-0', 'flex-1')
  expect(page?.className).not.toContain('100dvh')
})
