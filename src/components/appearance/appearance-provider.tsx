import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  ACCENT_STORAGE_KEY,
  CURSOR_STORAGE_KEY,
  DEFAULT_ACCENT,
  DEFAULT_CURSOR_STYLE,
  DEFAULT_PARTICLE_PREFERENCES,
  PARTICLE_PREFERENCE_KEYS,
  PARTICLE_STORAGE_KEYS,
  getAccentPalette,
  isAccentId,
  isCursorStyleId,
  type AccentId,
  type CursorStyleId,
  type ParticlePreferenceKey,
  type ParticlePreferences,
} from '../../lib/appearance'
import { useTheme } from '../theme/theme-context'
import { AppearanceContext } from './appearance-context'

function readAccent(): AccentId {
  if (typeof window === 'undefined') return DEFAULT_ACCENT

  try {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY)
    return isAccentId(stored) ? stored : DEFAULT_ACCENT
  } catch {
    return DEFAULT_ACCENT
  }
}

function readCursorStyle(): CursorStyleId {
  if (typeof window === 'undefined') return DEFAULT_CURSOR_STYLE

  try {
    const stored = localStorage.getItem(CURSOR_STORAGE_KEY)
    return isCursorStyleId(stored) ? stored : DEFAULT_CURSOR_STYLE
  } catch {
    return DEFAULT_CURSOR_STYLE
  }
}

function readParticlePreferences(): ParticlePreferences {
  const preferences = { ...DEFAULT_PARTICLE_PREFERENCES }

  if (typeof window === 'undefined') return preferences

  try {
    for (const key of PARTICLE_PREFERENCE_KEYS) {
      const stored = localStorage.getItem(PARTICLE_STORAGE_KEYS[key])

      if (stored === 'true' || stored === 'false') {
        preferences[key] = stored === 'true'
      }
    }
  } catch {
    return preferences
  }

  return preferences
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  const [accent, setAccent] = useState<AccentId>(readAccent)
  const [cursorStyle, setCursorStyle] = useState<CursorStyleId>(readCursorStyle)
  const [particles, setParticles] = useState<ParticlePreferences>(
    readParticlePreferences,
  )

  useLayoutEffect(() => {
    const palette = getAccentPalette(accent)
    const colors = theme === 'light' ? palette.light : palette.dark
    const root = document.documentElement

    root.dataset.accent = accent
    root.style.setProperty('--color-accent', colors.accent)
    root.style.setProperty('--color-accent-ink', colors.ink)

    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, accent)
    } catch {
      // The accent still applies when storage is unavailable.
    }
  }, [accent, theme])

  useLayoutEffect(() => {
    document.documentElement.dataset.cursor = cursorStyle

    try {
      localStorage.setItem(CURSOR_STORAGE_KEY, cursorStyle)
    } catch {
      // The cursor style still applies when storage is unavailable.
    }
  }, [cursorStyle])

  useLayoutEffect(() => {
    try {
      for (const key of PARTICLE_PREFERENCE_KEYS) {
        localStorage.setItem(PARTICLE_STORAGE_KEYS[key], String(particles[key]))
      }
    } catch {
      // Particle preferences still apply when storage is unavailable.
    }
  }, [particles])

  const setParticlePreference = useCallback(
    (key: ParticlePreferenceKey, value: boolean) => {
      setParticles((current) => ({ ...current, [key]: value }))
    },
    [],
  )

  const resetAppearance = useCallback(() => {
    setAccent(DEFAULT_ACCENT)
    setCursorStyle(DEFAULT_CURSOR_STYLE)
    setParticles(DEFAULT_PARTICLE_PREFERENCES)
  }, [])

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
    [accent, cursorStyle, particles, setParticlePreference, resetAppearance],
  )

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  )
}
