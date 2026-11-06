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
  getAccentPalette,
  isAccentId,
  isCursorStyleId,
  type AccentId,
  type CursorStyleId,
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

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  const [accent, setAccent] = useState<AccentId>(readAccent)
  const [cursorStyle, setCursorStyle] = useState<CursorStyleId>(readCursorStyle)

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

  const resetAppearance = useCallback(() => {
    setAccent(DEFAULT_ACCENT)
    setCursorStyle(DEFAULT_CURSOR_STYLE)
  }, [])

  const value = useMemo(
    () => ({
      accent,
      cursorStyle,
      setAccent,
      setCursorStyle,
      resetAppearance,
    }),
    [accent, cursorStyle, resetAppearance],
  )

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  )
}
