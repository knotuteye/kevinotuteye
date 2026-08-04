import { colors, world } from '../Theme'

/**
 * Typed access to the Theme.js palette.
 *
 * Several components assign a color by position in a list — the
 * `Object.keys(colors)[index % Object.keys(colors).length]` idiom that used to
 * be copy-pasted across WorkItem, ProjectItem, TechItem, AboutBlock and
 * Masthead. It lives here once, typed, and the 3D world reuses it to key
 * matcap materials off the same palette.
 */
export type PaletteName = keyof typeof colors

export const palette = colors as Record<PaletteName, string>
export const paletteNames = Object.keys(palette) as PaletteName[]

/** Cycles through the palette, safe for negative indices. */
export function paletteNameAt(index: number): PaletteName {
  const n = paletteNames.length
  return paletteNames[((Math.trunc(index) % n) + n) % n]
}

export function colorAt(index: number): string {
  return palette[paletteNameAt(index)]
}

/**
 * A lighter or darker version of a palette colour.
 *
 * The world had exactly seven object colours, one per palette entry, and it
 * showed: every boulder on the plain was the same off-white and every tree the
 * same green, so a field of them read as one repeated asset rather than as
 * scenery. folio carries some fifteen matcaps for the same reason.
 *
 * Tints rather than new hues, because the palette is the palette — pulling a
 * colour toward white or black keeps it recognisably the same family, and the
 * matcap generator caches on the resulting hex, so a variant costs one texture
 * and nothing per frame.
 *
 * `amount` is -1 (black) to 1 (white). Anything past about ±0.35 stops reading
 * as the same material.
 */
export function shade(hex: string, amount: number): string {
  const value = parseInt(hex.replace('#', ''), 16)
  const target = amount > 0 ? 255 : 0
  const weight = Math.min(1, Math.abs(amount))

  const channel = (shift: number) => {
    const from = (value >> shift) & 0xff
    return Math.round(from + (target - from) * weight)
  }

  const mixed = (channel(16) << 16) | (channel(8) << 8) | channel(0)
  return `#${mixed.toString(16).padStart(6, '0')}`
}

export { world }
