import { createContext, useContext } from 'react'

export type Theme = 'dark' | 'light'

export interface ThemeToggleOrigin {
  x: number
  y: number
}

interface ThemeContextValue {
  theme: Theme
  toggleTheme: (origin?: ThemeToggleOrigin) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
