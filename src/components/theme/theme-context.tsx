import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'

export type Theme = 'dark' | 'light'

export interface ThemeToggleOrigin {
  x: number
  y: number
}

interface ThemeContextValue {
  theme: Theme
  toggleTheme: (origin?: ThemeToggleOrigin) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const themeColors: Record<Theme, string> = {
  dark: '#08090a',
  light: '#f5f3ec',
}

function getInitialTheme(): Theme {
  if (typeof document === 'undefined') {
    return 'dark'
  }

  if (document.documentElement.dataset.theme === 'light') {
    return 'light'
  }

  try {
    if (localStorage.getItem('theme') === 'light') {
      return 'light'
    }
  } catch {
    // Storage can be unavailable in private browsing contexts.
  }

  return 'dark'
}

let themeSwitchId = 0

function clearThemeSwitching(root: HTMLElement, id: number) {
  if (id === themeSwitchId) {
    delete root.dataset.themeSwitching
  }
}

// Disable hover/color transitions for one painted frame so the whole page
// switches theme at once instead of fading section by section.
function beginThemeSwitch(root: HTMLElement) {
  const id = ++themeSwitchId
  root.dataset.themeSwitching = 'true'

  if (typeof requestAnimationFrame !== 'function') {
    window.setTimeout(() => clearThemeSwitching(root, id), 0)
    return
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => clearThemeSwitching(root, id))
  })
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement

  if (root.dataset.theme !== theme) {
    beginThemeSwitch(root)
    root.dataset.theme = theme
  }

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', themeColors[theme])

  try {
    localStorage.setItem('theme', theme)
  } catch {
    // The visual theme still applies when storage is unavailable.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggleTheme = useCallback(
    (origin?: ThemeToggleOrigin) => {
      const next: Theme = theme === 'dark' ? 'light' : 'dark'

      if (
        origin &&
        typeof document !== 'undefined' &&
        'startViewTransition' in document &&
        typeof window !== 'undefined' &&
        !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ) {
        const { x, y } = origin
        const endRadius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y),
        )
        const transition = (
          document as Document & {
            startViewTransition: (callback: () => void) => {
              ready: Promise<void>
            }
          }
        ).startViewTransition(() => {
          flushSync(() => setTheme(next))
        })
        void transition.ready.then(() => {
          document.documentElement.animate(
            [
              { clipPath: `circle(0px at ${x}px ${y}px)` },
              { clipPath: `circle(${endRadius}px at ${x}px ${y}px)` },
            ],
            {
              duration: 500,
              easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
              pseudoElement: '::view-transition-new(root)',
            },
          )
        })
        return
      }

      setTheme(next)
    },
    [theme],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.key.toLowerCase() !== 't'
      ) {
        return
      }

      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return
      }

      event.preventDefault()
      toggleTheme({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleTheme])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
