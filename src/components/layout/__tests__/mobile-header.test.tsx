import { fireEvent, render, screen } from '@testing-library/react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import { profile } from '../../../data/profile'
import { ThemeProvider } from '../../theme/theme-provider'
import { MobileHeader } from '../mobile-header'

vi.mock('@tanstack/react-router', async () => {
  const { createElement } = await import('react')

  return {
    Link: ({
      to,
      children,
      ...props
    }: AnchorHTMLAttributes<HTMLAnchorElement> & {
      to: string
      children: ReactNode
    }) => createElement('a', { href: to, ...props }, children),
  }
})

it('shows identity and theme control without a drawer trigger', () => {
  render(
    <ThemeProvider>
      <MobileHeader />
    </ThemeProvider>,
  )

  expect(
    screen.getByRole('link', { name: new RegExp(profile.name) }),
  ).toHaveClass('min-h-11')
  expect(
    screen.getByRole('link', { name: new RegExp(profile.name) }),
  ).toHaveAttribute('href', '/')
  expect(screen.getByRole('button', { name: /theme toggle/i })).toHaveClass(
    'min-h-11',
  )
  expect(
    screen.queryByRole('button', { name: /open navigation/i }),
  ).not.toBeInTheDocument()
})

it('drops the bottom border once the page scrolls', () => {
  render(
    <ThemeProvider>
      <MobileHeader />
    </ThemeProvider>,
  )

  const header = screen.getByRole('banner')
  expect(header).toHaveClass('border-line')

  Object.defineProperty(window, 'scrollY', {
    value: 120,
    configurable: true,
  })
  fireEvent.scroll(window)

  expect(header).toHaveClass('border-transparent')
  expect(header).not.toHaveClass('border-line')
})
