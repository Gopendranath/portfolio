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
      aria-keyshortcuts="T"
      title="Toggle theme (T)"
      className="group inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-2.5 text-muted transition-colors hover:border-accent hover:text-accent"
    >
      <span className="grid size-5 place-items-center rounded-full bg-accent text-accent-ink">
        {isDark ? (
          <MoonIcon className="size-3" />
        ) : (
          <SunIcon className="size-3" />
        )}
      </span>
      <span className="w-10 text-center font-mono text-[9px] uppercase tracking-[0.14em]">
        {isDark ? 'Dark' : 'Light'}
      </span>
      <kbd className="border border-line px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-muted group-hover:border-accent/40 group-hover:text-accent">
        T
      </kbd>
    </button>
  )
}
