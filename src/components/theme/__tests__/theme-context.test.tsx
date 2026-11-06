import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { ThemeProvider } from '../theme-provider'
import { useTheme } from '../theme-context'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
  delete document.documentElement.dataset.themeSwitching
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.append(meta)
  }
})

it('defaults to dark and persists the selected theme', () => {
  const { result } = renderHook(() => useTheme(), {
    wrapper: ThemeProvider,
  })

  expect(result.current.theme).toBe('dark')

  act(() => result.current.toggleTheme())
  expect(result.current.theme).toBe('light')
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(localStorage.getItem('theme')).toBe('light')

  act(() => result.current.toggleTheme())
  expect(result.current.theme).toBe('dark')
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem('theme')).toBe('dark')
})

it('suppresses color transitions while the theme changes', () => {
  const { result } = renderHook(() => useTheme(), {
    wrapper: ThemeProvider,
  })

  act(() => result.current.toggleTheme())

  expect(document.documentElement.dataset.themeSwitching).toBe('true')
  expect(document.documentElement.dataset.theme).toBe('light')
})

it('reads a persisted light preference', () => {
  localStorage.setItem('theme', 'light')

  const { result } = renderHook(() => useTheme(), {
    wrapper: ThemeProvider,
  })

  expect(result.current.theme).toBe('light')
  expect(document.documentElement.dataset.theme).toBe('light')
})

it('toggles when the t key is pressed', () => {
  const { result } = renderHook(() => useTheme(), {
    wrapper: ThemeProvider,
  })

  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }))
  })

  expect(result.current.theme).toBe('light')
  expect(document.documentElement.dataset.theme).toBe('light')
})

it('animates the t shortcut from the viewport center', async () => {
  const animate = vi.fn(
    () => ({ finished: Promise.resolve() }) as unknown as Animation,
  )
  const ready = Promise.resolve()
  const startViewTransition = vi.fn((callback: () => void) => {
    callback()
    return { ready } as unknown as ViewTransition
  })
  const originalMatchMedia = window.matchMedia
  const originalInnerWidth = window.innerWidth
  const originalInnerHeight = window.innerHeight
  Object.assign(document, { startViewTransition })
  Object.defineProperty(document.documentElement, 'animate', {
    configurable: true,
    value: animate,
  })
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
  }) as unknown as typeof window.matchMedia
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1000,
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: 800,
  })

  renderHook(() => useTheme(), {
    wrapper: ThemeProvider,
  })

  await act(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }))
    await ready
  })

  expect(startViewTransition).toHaveBeenCalledTimes(1)
  expect(animate).toHaveBeenCalledTimes(1)
  const [keyframes] = animate.mock.calls[0] as unknown as [
    Array<Record<string, string>>,
    Record<string, unknown>,
  ]
  expect(keyframes[0].clipPath).toContain('circle(0px at 500px 400px)')

  delete (document as unknown as Record<string, unknown>).startViewTransition
  delete (document.documentElement as unknown as Record<string, unknown>)
    .animate
  window.matchMedia = originalMatchMedia
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: originalInnerWidth,
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: originalInnerHeight,
  })
})

it('ignores the t shortcut while typing in a form field', () => {
  const input = document.createElement('input')
  document.body.append(input)
  input.focus()

  const { result } = renderHook(() => useTheme(), {
    wrapper: ThemeProvider,
  })

  act(() => {
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 't', bubbles: true }),
    )
  })

  expect(result.current.theme).toBe('dark')
  input.remove()
})

it('reveals the new theme with a circular clip from the toggle origin', async () => {
  const animate = vi.fn(
    () => ({ finished: Promise.resolve() }) as unknown as Animation,
  )
  const ready = Promise.resolve()
  const startViewTransition = vi.fn((callback: () => void) => {
    callback()
    return { ready } as unknown as ViewTransition
  })
  const originalMatchMedia = window.matchMedia
  Object.assign(document, { startViewTransition })
  Object.defineProperty(document.documentElement, 'animate', {
    configurable: true,
    value: animate,
  })
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
  }) as unknown as typeof window.matchMedia

  const { result } = renderHook(() => useTheme(), {
    wrapper: ThemeProvider,
  })

  await act(async () => {
    result.current.toggleTheme({ x: 10, y: 20 })
    await ready
  })

  expect(startViewTransition).toHaveBeenCalledTimes(1)
  expect(animate).toHaveBeenCalledTimes(1)
  const [keyframes, options] = animate.mock.calls[0] as unknown as [
    Array<Record<string, string>>,
    Record<string, unknown>,
  ]
  expect(keyframes[0].clipPath).toContain('circle(0px at 10px 20px)')
  expect(keyframes[1].clipPath).toContain('circle(')
  expect(keyframes[1].clipPath).toContain('at 10px 20px')
  expect(options).toMatchObject({
    pseudoElement: '::view-transition-new(root)',
  })

  delete (document as unknown as Record<string, unknown>).startViewTransition
  delete (document.documentElement as unknown as Record<string, unknown>)
    .animate
  window.matchMedia = originalMatchMedia
})
