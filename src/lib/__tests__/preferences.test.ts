import { describe, expect, it } from 'vitest'
import {
  createDefaultPreferences,
  PREFERENCES_STORAGE_KEY,
  readPreferences,
  writePreferences,
} from '@/lib/preferences'

function memoryStorage(initial: Record<string, string> = {}) {
  const entries = new Map(Object.entries(initial))

  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value)
    },
    removeItem: (key: string) => {
      entries.delete(key)
    },
    clear: () => entries.clear(),
    key: (index: number) => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size
    },
  } as Storage
}

describe('readPreferences', () => {
  it('returns defaults for empty storage', () => {
    expect(readPreferences(memoryStorage())).toEqual(createDefaultPreferences())
  })

  it('falls back per field for malformed values', () => {
    const storage = memoryStorage({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify({
        version: 1,
        accent: 42,
        cursorStyle: 'crosshair',
        particles: { cloud: 'yes', hover: false },
      }),
    })

    expect(readPreferences(storage)).toEqual({
      accent: 'lime',
      cursorStyle: 'crosshair',
      particles: { cloud: true, scan: true, dust: true, hover: false },
    })
  })

  it('survives unparseable JSON', () => {
    const storage = memoryStorage({ [PREFERENCES_STORAGE_KEY]: '{not json' })

    expect(readPreferences(storage)).toEqual(createDefaultPreferences())
  })
})

describe('writePreferences', () => {
  it('round-trips through storage', () => {
    const storage = memoryStorage()
    const preferences = {
      accent: 'amber',
      cursorStyle: 'system',
      particles: { cloud: false, scan: true, dust: false, hover: true },
    } as const

    writePreferences(preferences, storage)

    expect(readPreferences(storage)).toEqual(preferences)
  })

  it('does nothing without storage', () => {
    expect(() => writePreferences(createDefaultPreferences(), null)).not.toThrow()
  })
})
