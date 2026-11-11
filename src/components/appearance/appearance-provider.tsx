import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import { useTheme } from '@/components/theme/theme-context'
import {
  type AccentId,
  type CursorStyleId,
  getAccentPalette,
  type ParticlePreferenceKey,
} from '@/lib/appearance'
import {
  createDefaultPreferences,
  type Preferences,
  readPreferences,
  subscribeToPreferences,
  writePreferences,
} from '@/lib/preferences'
import { AppearanceContext } from './appearance-context'

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  const [preferences, setPreferences] = useState<Preferences>(readPreferences)

  const { accent, cursorStyle, particles } = preferences

  useLayoutEffect(() => {
    const palette = getAccentPalette(accent)
    const colors = theme === 'light' ? palette.light : palette.dark
    const root = document.documentElement

    root.dataset.accent = accent
    root.style.setProperty('--color-accent', colors.accent)
    root.style.setProperty('--color-accent-ink', colors.ink)
  }, [accent, theme])

  useEffect(
    () =>
      subscribeToPreferences((next) => {
        setPreferences(next ?? createDefaultPreferences())
      }),
    [],
  )

  const updatePreferences = useCallback(
    (update: (current: Preferences) => Preferences) => {
      setPreferences((current) => {
        const next = update(current)
        writePreferences(next)
        return next
      })
    },
    [],
  )

  const setAccent = useCallback(
    (next: AccentId) =>
      updatePreferences((current) => ({ ...current, accent: next })),
    [updatePreferences],
  )

  const setCursorStyle = useCallback(
    (next: CursorStyleId) =>
      updatePreferences((current) => ({ ...current, cursorStyle: next })),
    [updatePreferences],
  )

  const setParticlePreference = useCallback(
    (key: ParticlePreferenceKey, value: boolean) =>
      updatePreferences((current) => ({
        ...current,
        particles: { ...current.particles, [key]: value },
      })),
    [updatePreferences],
  )

  const resetAppearance = useCallback(
    () => updatePreferences(() => createDefaultPreferences()),
    [updatePreferences],
  )

  const value = useMemo(
    () => ({
      accent,
      cursorStyle,
      particles,
      setAccent,
      setCursorStyle,
      setParticlePreference,
      resetAppearance,
    }),
    [
      accent,
      cursorStyle,
      particles,
      setAccent,
      setCursorStyle,
      setParticlePreference,
      resetAppearance,
    ],
  )

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  )
}
