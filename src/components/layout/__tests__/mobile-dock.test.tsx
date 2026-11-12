import { render, screen, within } from '@testing-library/react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import { MobileDock } from '@/components/layout/mobile-dock'
import { navItems } from '@/data/navigation'

const routerState = vi.hoisted(() => ({ pathname: '/' }))

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
    useRouterState: ({
      select,
    }: {
      select: (state: { location: { pathname: string } }) => string
    }) => select({ location: { pathname: routerState.pathname } }),
  }
})

it('renders every destination and marks the active route', () => {
  routerState.pathname = '/projects'
  render(<MobileDock />)

  const nav = screen.getByRole('navigation', { name: 'Primary mobile' })
  const links = within(nav).getAllByRole('link')

  expect(links).toHaveLength(navItems.length)
  expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects')
  expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')

  const indicator = nav.querySelector('[data-dock-indicator]')
  expect(indicator).not.toBeNull()
  expect(indicator).toHaveStyle({ transform: 'translateX(100%)' })
})
