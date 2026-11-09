import type { RgbColor } from './types'

export function parseColor(value: string): RgbColor | null {
  const input = value.trim().toLowerCase()

  const shortHex = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(input)
  if (shortHex) {
    return {
      r: Number.parseInt(`${shortHex[1]}${shortHex[1]}`, 16),
      g: Number.parseInt(`${shortHex[2]}${shortHex[2]}`, 16),
      b: Number.parseInt(`${shortHex[3]}${shortHex[3]}`, 16),
    }
  }

  const longHex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(input)
  if (longHex) {
    return {
      r: Number.parseInt(longHex[1], 16),
      g: Number.parseInt(longHex[2], 16),
      b: Number.parseInt(longHex[3], 16),
    }
  }

  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/.exec(input)
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
    }
  }

  return null
}
