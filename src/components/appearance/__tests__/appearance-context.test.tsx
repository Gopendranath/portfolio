import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, expect, it } from 'vitest'
import { ACCENT_STORAGE_KEY, CURSOR_STORAGE_KEY } from '../../../lib/appearance'
import { ThemeProvider } from '../../theme/theme-provider'
import { useAppearance } from '../appearance-context'
import { AppearanceProvider } from '../appearance-provider'

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AppearanceProvider>{children}</AppearanceProvider>
    </ThemeProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.accent
  delete document.documentElement.dataset.cursor
  delete document.documentElement.dataset.theme
  document.documentElement.style.removeProperty('--color-accent')
  document.documentElement.style.removeProperty('--color-accent-ink')
})

it('defaults to the target cursor and lime accent', () => {
  const { result } = renderHook(() => useAppearance(), { wrapper: Wrapper })

  expect(result.current.accent).toBe('lime')
  expect(result.current.cursorStyle).toBe('target')
  expect(document.documentElement.dataset.accent).toBe('lime')
  expect(document.documentElement.dataset.cursor).toBe('target')
  expect(
    document.documentElement.style.getPropertyValue('--color-accent'),
  ).toBe('#c7f464')
  expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBe('lime')
  expect(localStorage.getItem(CURSOR_STORAGE_KEY)).toBe('target')
})

it('applies and persists accent and cursor changes', () => {
  const { result } = renderHook(() => useAppearance(), { wrapper: Wrapper })

  act(() => result.current.setAccent('cyan'))
  act(() => result.current.setCursorStyle('crosshair'))

  expect(result.current.accent).toBe('cyan')
  expect(result.current.cursorStyle).toBe('crosshair')
  expect(document.documentElement.dataset.accent).toBe('cyan')
  expect(document.documentElement.dataset.cursor).toBe('crosshair')
  expect(
    document.documentElement.style.getPropertyValue('--color-accent'),
  ).toBe('#67e8f9')
  expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBe('cyan')
  expect(localStorage.getItem(CURSOR_STORAGE_KEY)).toBe('crosshair')
})

it('applies the light variant of the selected accent', () => {
  localStorage.setItem('theme', 'light')

  renderHook(() => useAppearance(), { wrapper: Wrapper })

  expect(
    document.documentElement.style.getPropertyValue('--color-accent'),
  ).toBe('#3f6212')
  expect(
    document.documentElement.style.getPropertyValue('--color-accent-ink'),
  ).toBe('#f8f7f1')
})

it('reads stored preferences and ignores invalid values', () => {
  localStorage.setItem(ACCENT_STORAGE_KEY, 'violet')
  localStorage.setItem(CURSOR_STORAGE_KEY, 'nonsense')

  const { result } = renderHook(() => useAppearance(), { wrapper: Wrapper })

  expect(result.current.accent).toBe('violet')
  expect(result.current.cursorStyle).toBe('target')
})

it('resets both preferences', () => {
  const { result } = renderHook(() => useAppearance(), { wrapper: Wrapper })

  act(() => result.current.setAccent('rose'))
  act(() => result.current.setCursorStyle('system'))
  act(() => result.current.resetAppearance())

  expect(result.current.accent).toBe('lime')
  expect(result.current.cursorStyle).toBe('target')
  expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBe('lime')
  expect(localStorage.getItem(CURSOR_STORAGE_KEY)).toBe('target')
})
