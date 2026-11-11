import type { ReactNode } from 'react'

interface AppearanceRadioProps {
  name: string
  value: string
  checked: boolean
  onChange: () => void
  className?: string
  children: ReactNode
}

/**
 * Radio card used by the appearance pickers. Owns the shared label, hidden
 * input, and selected/focus treatment; callers supply layout and content.
 */
export function AppearanceRadio({
  name,
  value,
  checked,
  onChange,
  className = '',
  children,
}: AppearanceRadioProps) {
  return (
    <label
      className={`cursor-target flex cursor-pointer border transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
        checked
          ? 'border-accent bg-accent/5'
          : 'border-line hover:border-muted/60'
      } ${className}`.trim()}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {children}
    </label>
  )
}
