import { createContext, useContext } from 'react'
import type {
  AccentId,
  CursorStyleId,
  ParticlePreferenceKey,
  ParticlePreferences,
} from '@/lib/appearance'

export interface AppearanceContextValue {
  accent: AccentId
  cursorStyle: CursorStyleId
  particles: ParticlePreferences
  setAccent: (accent: AccentId) => void
  setCursorStyle: (cursorStyle: CursorStyleId) => void
  setParticlePreference: (key: ParticlePreferenceKey, value: boolean) => void
  resetAppearance: () => void
}

export const AppearanceContext = createContext<AppearanceContextValue | null>(
  null,
)

export function useAppearance() {
  const context = useContext(AppearanceContext)

  if (!context) {
    throw new Error('useAppearance must be used within an AppearanceProvider')
  }

  return context
}
