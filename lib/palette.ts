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

export { world }
