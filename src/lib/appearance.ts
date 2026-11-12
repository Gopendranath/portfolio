export type AccentId = 'lime' | 'cyan' | 'amber' | 'rose' | 'violet'

export interface AccentPalette {
  id: AccentId
  label: string
  swatch: string
  dark: {
    accent: string
    ink: string
  }
  light: {
    accent: string
    ink: string
  }
}

export type CursorStyleId = 'target' | 'crosshair' | 'system'

export interface CursorStyleOption {
  id: CursorStyleId
  label: string
  description: string
}

export type ParticlePreferenceKey = 'cloud' | 'scan' | 'dust' | 'hover'

export interface ParticlePreferences {
  cloud: boolean
  scan: boolean
  dust: boolean
  hover: boolean
}

export const DEFAULT_ACCENT: AccentId = 'lime'
export const DEFAULT_CURSOR_STYLE: CursorStyleId = 'target'
export const DEFAULT_PARTICLE_PREFERENCES: ParticlePreferences = {
  cloud: true,
  scan: true,
  dust: true,
  hover: true,
}

export const ACCENT_STORAGE_KEY = 'appearance-accent'
export const CURSOR_STORAGE_KEY = 'appearance-cursor'

export const PARTICLE_PREFERENCE_KEYS: readonly ParticlePreferenceKey[] = [
  'cloud',
  'scan',
  'dust',
  'hover',
]

export const PARTICLE_STORAGE_KEYS: Record<ParticlePreferenceKey, string> = {
  cloud: 'appearance-particle-cloud',
  scan: 'appearance-particle-scan',
  dust: 'appearance-particle-dust',
  // Re-baselined when pointer interaction became the default. The old key was
  // written automatically on first visit, so a stored "false" there is not a
  // deliberate opt-out and would otherwise mask the new default forever.
  hover: 'appearance-particle-hover-2',
}

export const accentPalettes: readonly AccentPalette[] = [
  {
    id: 'lime',
    label: 'Lime',
    swatch: '#c7f464',
    dark: { accent: '#c7f464', ink: '#0a0b0a' },
    light: { accent: '#3f6212', ink: '#f8f7f1' },
  },
  {
    id: 'cyan',
    label: 'Cyan',
    swatch: '#67e8f9',
    dark: { accent: '#67e8f9', ink: '#062a30' },
    light: { accent: '#0e7490', ink: '#ecfeff' },
  },
  {
    id: 'amber',
    label: 'Amber',
    swatch: '#fbbf24',
    dark: { accent: '#fbbf24', ink: '#2a1a00' },
    light: { accent: '#a16207', ink: '#fffbeb' },
  },
  {
    id: 'rose',
    label: 'Rose',
    swatch: '#fb7185',
    dark: { accent: '#fb7185', ink: '#2b0710' },
    light: { accent: '#be123c', ink: '#fff1f2' },
  },
  {
    id: 'violet',
    label: 'Violet',
    swatch: '#c4b5fd',
    dark: { accent: '#c4b5fd', ink: '#1e1233' },
    light: { accent: '#6d28d9', ink: '#f5f3ff' },
  },
]

export const cursorStyles: readonly CursorStyleOption[] = [
  {
    id: 'target',
    label: 'Target',
    description: 'Reticle brackets that snap around links, buttons, cards, and text targets.',
  },
  {
    id: 'crosshair',
    label: 'Crosshair',
    description: 'A minimal reticle that follows the pointer without snapping to targets.',
  },
  {
    id: 'system',
    label: 'System',
    description: "Use your operating system's own pointer.",
  },
]

export function isAccentId(value: unknown): value is AccentId {
  return accentPalettes.some((palette) => palette.id === value)
}

export function isCursorStyleId(value: unknown): value is CursorStyleId {
  return cursorStyles.some((style) => style.id === value)
}

export function getAccentPalette(id: AccentId): AccentPalette {
  const palette = accentPalettes.find((candidate) => candidate.id === id)

  if (!palette) {
    throw new Error(`Unknown accent palette: ${id}`)
  }

  return palette
}
