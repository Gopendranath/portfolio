import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, expect, it } from 'vitest'
import { useAppearance } from '@/components/appearance/appearance-context'
import { AppearanceProvider } from '@/components/appearance/appearance-provider'
import { ThemeProvider } from '@/components/theme/theme-provider'
import {
  ACCENT_STORAGE_KEY,
  CURSOR_STORAGE_KEY,
  DEFAULT_PARTICLE_PREFERENCES,
  PARTICLE_STORAGE_KEYS,
} from '@/lib/appearance'
import { PREFERENCES_STORAGE_KEY, readPreferences } from '@/lib/preferences'

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AppearanceProvider>{children}</AppearanceProvider>
    </ThemeProvider>
  )
}

function storedPreferences() {
  const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.accent
  delete document.documentElement.dataset.theme
  document.documentElement.style.removeProperty('--color-accent')
  document.documentElement.style.removeProperty('--color-accent-ink')
})

it('defaults to the target cursor and lime accent without writing storage', () => {
  const { result } = renderHook(() => useAppearance(), { wrapper: Wrapper })

  expect(result.current.accent).toBe('lime')
  expect(result.current.cursorStyle).toBe('target')
  expect(document.documentElement.dataset.accent).toBe('lime')
  expect(
    document.documentElement.style.getPropertyValue('--color-accent'),
  ).toBe('#c7f464')
  expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).toBeNull()
})

it('defaults the particle cloud on with hover on', () => {
  const { result } = renderHook(() => useAppearance(), { wrapper: Wrapper })

  expect(result.current.particles).toEqual(DEFAULT_PARTICLE_PREFERENCES)
  expect(result.current.particles).toEqual({
    cloud: true,
    scan: true,
    dust: true,
    hover: true,
  })
})

it('persists individual particle preferences in one blob', () => {
  const { result } = renderHook(() => useAppearance(), { wrapper: Wrapper })

  act(() => result.current.setParticlePreference('hover', true))
  act(() => result.current.setParticlePreference('cloud', false))

  expect(result.current.particles.hover).toBe(true)
  expect(result.current.particles.cloud).toBe(false)
  expect(storedPreferences()?.particles).toEqual({
    cloud: false,
    scan: true,
    dust: true,
    hover: true,
  })
})

it('resets particle preferences to the defaults', () => {
  const { result } = renderHook(() => useAppearance(), { wrapper: Wrapper })

  act(() => result.current.setParticlePreference('scan', false))
  act(() => result.current.setParticlePreference('hover', true))
  act(() => result.current.resetAppearance())

  expect(result.current.particles).toEqual(DEFAULT_PARTICLE_PREFERENCES)
  expect(storedPreferences()?.particles).toEqual(DEFAULT_PARTICLE_PREFERENCES)
})

it('applies and persists accent and cursor changes', () => {
  const { result } = renderHook(() => useAppearance(), { wrapper: Wrapper })

  act(() => result.current.setAccent('cyan'))
  act(() => result.current.setCursorStyle('crosshair'))

  expect(result.current.accent).toBe('cyan')
  expect(result.current.cursorStyle).toBe('crosshair')
  expect(document.documentElement.dataset.accent).toBe('cyan')
  expect(
    document.documentElement.style.getPropertyValue('--color-accent'),
  ).toBe('#67e8f9')
  expect(storedPreferences()).toMatchObject({
    accent: 'cyan',
    cursorStyle: 'crosshair',
  })
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

it('migrates legacy keys once and removes them', () => {
  localStorage.setItem(ACCENT_STORAGE_KEY, 'violet')
  localStorage.setItem(CURSOR_STORAGE_KEY, 'nonsense')
  localStorage.setItem(PARTICLE_STORAGE_KEYS.cloud, 'false')
  localStorage.setItem(PARTICLE_STORAGE_KEYS.hover, 'true')
  localStorage.setItem(PARTICLE_STORAGE_KEYS.scan, 'nonsense')

  const { result } = renderHook(() => useAppearance(), { wrapper: Wrapper })

  expect(result.current.accent).toBe('violet')
  expect(result.current.cursorStyle).toBe('target')
  expect(result.current.particles).toEqual({
    cloud: false,
    scan: true,
    dust: true,
    hover: true,
  })
  expect(storedPreferences()).toMatchObject({
    accent: 'violet',
    cursorStyle: 'target',
  })
  expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBeNull()
  expect(localStorage.getItem(CURSOR_STORAGE_KEY)).toBeNull()
  expect(localStorage.getItem(PARTICLE_STORAGE_KEYS.cloud)).toBeNull()
})

it('ignores stored values for unknown accents and shared it through the blob', () => {
  localStorage.setItem(
    PREFERENCES_STORAGE_KEY,
    JSON.stringify({ version: 1, accent: 'chartreuse', cursorStyle: 'system' }),
  )

  expect(readPreferences()).toMatchObject({
    accent: 'lime',
    cursorStyle: 'system',
  })
})

it('resets appearance preferences', () => {
  const { result } = renderHook(() => useAppearance(), { wrapper: Wrapper })

  act(() => result.current.setAccent('rose'))
  act(() => result.current.setCursorStyle('system'))
  act(() => result.current.resetAppearance())

  expect(result.current.accent).toBe('lime')
  expect(result.current.cursorStyle).toBe('target')
  expect(storedPreferences()).toMatchObject({
    accent: 'lime',
    cursorStyle: 'target',
  })
})
