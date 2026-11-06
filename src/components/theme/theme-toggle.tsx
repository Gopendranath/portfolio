import { MoonIcon, SunIcon } from '../ui/icons'
import { useTheme } from './theme-context'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      className="flex w-full items-center justify-between border border-line px-3 py-3 text-left font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-accent hover:text-accent"
    >
      <span>Theme — {isDark ? 'dark' : 'light'}</span>
      {isDark ? (
        <SunIcon className="size-3.5" />
      ) : (
        <MoonIcon className="size-3.5" />
      )}
    </button>
  )
}
