import {
  ACCENT_STORAGE_KEY,
  type AccentId,
  CURSOR_STORAGE_KEY,
  type CursorStyleId,
  DEFAULT_ACCENT,
  DEFAULT_CURSOR_STYLE,
  DEFAULT_PARTICLE_PREFERENCES,
  isAccentId,
  isCursorStyleId,
  PARTICLE_PREFERENCE_KEYS,
  PARTICLE_STORAGE_KEYS,
  type ParticlePreferences,
} from './appearance.ts'

/**
 * One versioned blob instead of six loose keys: partial or malformed values
 * fall back per field, and legacy keys are migrated once.
 */
export const PREFERENCES_STORAGE_KEY = 'appearance:v1'
const PREFERENCES_VERSION = 1

export interface Preferences {
  accent: AccentId
  cursorStyle: CursorStyleId
  particles: ParticlePreferences
}

export function createDefaultPreferences(): Preferences {
  return {
    accent: DEFAULT_ACCENT,
    cursorStyle: DEFAULT_CURSOR_STYLE,
    particles: { ...DEFAULT_PARTICLE_PREFERENCES },
  }
}

function getStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function readItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function removeItem(storage: Storage, key: string): void {
  try {
    storage.removeItem(key)
  } catch {
    // Storage can be read-only; a stale key is harmless.
  }
}

function parsePreferences(raw: string | null): Preferences | null {
  if (!raw) {
    return null
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const candidate = parsed as {
    accent?: unknown
    cursorStyle?: unknown
    particles?: unknown
  }
  const defaults = createDefaultPreferences()

  return {
    accent: isAccentId(candidate.accent) ? candidate.accent : defaults.accent,
    cursorStyle: isCursorStyleId(candidate.cursorStyle)
      ? candidate.cursorStyle
      : defaults.cursorStyle,
    particles: {
      ...defaults.particles,
      ...parseParticles(candidate.particles),
    },
  }
}

function parseParticles(value: unknown): Partial<ParticlePreferences> {
  if (!value || typeof value !== 'object') {
    return {}
  }

  const source = value as Record<string, unknown>
  const particles: Partial<ParticlePreferences> = {}

  for (const key of PARTICLE_PREFERENCE_KEYS) {
    const entry = source[key]

    if (typeof entry === 'boolean') {
      particles[key] = entry
    }
  }

  return particles
}

function readLegacyPreferences(storage: Storage): Preferences | null {
  const accent = readItem(storage, ACCENT_STORAGE_KEY)
  const cursorStyle = readItem(storage, CURSOR_STORAGE_KEY)
  const hasParticleKey = PARTICLE_PREFERENCE_KEYS.some(
    (key) => readItem(storage, PARTICLE_STORAGE_KEYS[key]) !== null,
  )

  if (accent === null && cursorStyle === null && !hasParticleKey) {
    return null
  }

  const defaults = createDefaultPreferences()

  return {
    accent: isAccentId(accent) ? accent : defaults.accent,
    cursorStyle: isCursorStyleId(cursorStyle) ? cursorStyle : defaults.cursorStyle,
    particles: {
      ...defaults.particles,
      ...parseParticles(
        Object.fromEntries(
          PARTICLE_PREFERENCE_KEYS.map((key) => {
            const stored = readItem(storage, PARTICLE_STORAGE_KEYS[key])

            if (stored === 'true') return [key, true]
            if (stored === 'false') return [key, false]
            return [key, undefined]
          }),
        ),
      ),
    },
  }
}

function clearLegacyPreferences(storage: Storage): void {
  removeItem(storage, ACCENT_STORAGE_KEY)
  removeItem(storage, CURSOR_STORAGE_KEY)

  for (const key of PARTICLE_PREFERENCE_KEYS) {
    removeItem(storage, PARTICLE_STORAGE_KEYS[key])
  }
}

export function readPreferences(storage: Storage | null = getStorage()): Preferences {
  if (!storage) {
    return createDefaultPreferences()
  }

  const stored = parsePreferences(readItem(storage, PREFERENCES_STORAGE_KEY))

  if (stored) {
    return stored
  }

  const legacy = readLegacyPreferences(storage)

  if (legacy) {
    writePreferences(legacy, storage)
    clearLegacyPreferences(storage)
    return legacy
  }

  return createDefaultPreferences()
}

export function writePreferences(
  preferences: Preferences,
  storage: Storage | null = getStorage(),
): void {
  if (!storage) {
    return
  }

  try {
    storage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ version: PREFERENCES_VERSION, ...preferences }),
    )
  } catch {
    // Preferences still apply for this session when storage is unavailable.
  }
}

/** Keeps other tabs in sync; `null` means the blob was removed. */
export function subscribeToPreferences(
  listener: (preferences: Preferences | null) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== PREFERENCES_STORAGE_KEY) {
      return
    }

    listener(parsePreferences(event.newValue))
  }

  window.addEventListener('storage', handleStorage)

  return () => window.removeEventListener('storage', handleStorage)
}
