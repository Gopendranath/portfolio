import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { ThemeProvider, useTheme } from './theme-context'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
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
