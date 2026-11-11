import { MoonIcon, SunIcon } from '../ui/icons'
import { Tooltip, TooltipTrigger } from '../ui/tooltip'
import { useTheme } from './theme-context'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const currentTheme = isDark ? 'Dark' : 'Light'
  const nextTheme = isDark ? 'light' : 'dark'

  return (
    <Tooltip label="Toggle theme (T)" placement="right">
      <TooltipTrigger
        type="button"
        onClick={(event) => toggleTheme({ x: event.clientX, y: event.clientY })}
        aria-label={`${currentTheme} theme toggle (T). Switch to ${nextTheme} theme`}
        aria-keyshortcuts="T"
        className={`group inline-flex items-center gap-2.5 text-muted transition-colors hover:text-accent ${className}`}
      >
        {isDark ? (
          <MoonIcon className="size-3.5 text-accent" />
        ) : (
          <SunIcon className="size-3.5 text-accent" />
        )}
        <span className="font-mono text-[9px] uppercase leading-none tracking-[0.16em] text-ink transition-colors group-hover:text-accent">
          {currentTheme}
        </span>
        <kbd className="border border-line px-1 py-0.5 font-mono text-[8px] uppercase leading-none tracking-[0.12em] text-muted transition-colors group-hover:border-accent/40 group-hover:text-accent">
          T
        </kbd>
      </TooltipTrigger>
    </Tooltip>
  )
}
