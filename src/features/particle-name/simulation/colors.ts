import type { RgbColor } from './types'

export function parseColor(value: string): RgbColor | null {
  const input = value.trim().toLowerCase()

  const shortHex = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(input)
  if (shortHex) {
    const [, r = '0', g = '0', b = '0'] = shortHex
    return {
      r: Number.parseInt(`${r}${r}`, 16),
      g: Number.parseInt(`${g}${g}`, 16),
      b: Number.parseInt(`${b}${b}`, 16),
    }
  }

  const longHex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(input)
  if (longHex) {
    const [, r = '00', g = '00', b = '00'] = longHex
    return {
      r: Number.parseInt(r, 16),
      g: Number.parseInt(g, 16),
      b: Number.parseInt(b, 16),
    }
  }

  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/.exec(input)
  if (rgb) {
    const [, r = '0', g = '0', b = '0'] = rgb
    return {
      r: Number(r),
      g: Number(g),
      b: Number(b),
    }
  }

  return null
}
