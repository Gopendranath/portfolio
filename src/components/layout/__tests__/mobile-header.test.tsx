import { render, screen } from '@testing-library/react'
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
  ).toHaveAttribute('href', '/')
  expect(
    screen.getByRole('button', { name: /theme toggle/i }),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /open navigation/i }),
  ).not.toBeInTheDocument()
})
