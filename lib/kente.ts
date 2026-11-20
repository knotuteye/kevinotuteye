import { dyes } from '../Theme'

/**
 * The loom's pattern book.
 *
 * Kente is woven on a narrow-strip loom, one strip at a time, and the strips
 * are then sewn edge to edge. Along a strip, warp-faced sections (where the
 * lengthwise warp threads hide the weft, showing fine vertical stripes)
 * alternate with weft-faced blocks (where the crosswise weft covers the warp
 * and carries the motif). Neighbouring strips are offset by half a block, so
 * once they are sewn the blocks fall into a checkerboard.
 *
 * This module describes strips in those terms and compiles them into two
 * small textures for the shader in components/cloth/engine.ts:
 *
 *   structure  one texel per thread crossing: warp dye, weft dye, which one
 *              is on top. Read exactly, for the thread-level close-up.
 *   colour     the visible colour of each crossing, mipmapped, so the cloth
 *              filters correctly when it is far away instead of shimmering.
 */

export const DYES = dyes as readonly string[]

export const Dye = {
  Black: 0,
  Gold: 1,
  Red: 2,
  Green: 3,
  Blue: 4,
  White: 5,
  Orange: 6,
  Maroon: 7,
} as const
export type Dye = (typeof Dye)[keyof typeof Dye]

/** Warp ends per strip. A real strip has more; this keeps threads legible. */
export const ENDS = 48
/** Picks in a warp-faced section and in a weft-faced block. */
export const WARP_PICKS = 22
export const WEFT_PICKS = 48
export const UNIT = WARP_PICKS + WEFT_PICKS
/** Motif blocks per repeat. The texture is `UNIT * BLOCKS` picks tall. */
export const BLOCKS = 4
export const PERIOD = UNIT * BLOCKS

export type Motif =
  | 'bars'
  | 'check'
  | 'diamond'
  | 'hourglass'
  | 'zigzag'
  | 'ladder'
  | 'dust'
  | 'steps'
  | 'plain'

export type Block = { motif: Motif; fg: Dye; bg: Dye; accent: Dye }

export type StripDraft = {
  /** Symmetric warp stripe, listed from the selvedge to the centre. */
  warp: [Dye, number][]
  /** Weft colour in the warp-faced sections, seen only between ends. */
  weft: Dye
  /** One block per repeat, `BLOCKS` long. */
  blocks: Block[]
}

/* ------------------------------------------------------------------ */
/* Motifs                                                              */
/* ------------------------------------------------------------------ */

/**
 * The colour of one crossing inside a weft-faced block. `x` is the end
 * (0..ENDS-1) and `y` the pick (0..WEFT_PICKS-1). Supplementary-weft motifs are
 * picked up in groups of ends, so everything snaps to a 4 x 4 grid.
 */
function motifAt(block: Block, x: number, y: number): Dye {
  const { fg, bg, accent } = block
  const gx = Math.floor(x / 4) // 0..11
  const gy = Math.floor(y / 4) // 0..11
  const cx = Math.abs(gx - 5.5)
  const cy = Math.abs(gy - 5.5)
  // A thin frame of weft bars top and bottom, as on most blocks.
  if (y < 2 || y >= WEFT_PICKS - 2) return accent
  if (y < 4 || y >= WEFT_PICKS - 4) return bg

  switch (block.motif) {
    case 'plain':
      return Math.floor(y / 6) % 2 ? bg : fg
    case 'bars': {
      const band = Math.floor((y - 4) / 5)
      return band % 3 === 1 ? accent : band % 2 ? bg : fg
    }
    case 'check':
      return (Math.floor(gx / 2) + Math.floor(gy / 2)) % 2 ? fg : bg
    case 'diamond': {
      const d = Math.floor(cx + cy)
      if (d < 2) return accent
      return d % 3 === 0 ? bg : d % 3 === 1 ? fg : accent
    }
    case 'hourglass':
      if (cx <= cy) return cy < 1.5 ? accent : fg
      return (gx + gy) % 2 ? bg : accent
    case 'zigzag': {
      const z = (gy + Math.abs((gx % 6) - 3)) % 4
      return z < 2 ? fg : z === 2 ? accent : bg
    }
    case 'ladder':
      if (gx % 4 === 1 || gx % 4 === 2) return gy % 3 === 0 ? accent : fg
      return gy % 3 === 0 ? fg : bg
    case 'dust':
      return gx % 2 === 0 && gy % 2 === 0 ? fg : (gx + gy) % 4 === 1 ? accent : bg
    case 'steps': {
      const step = Math.floor(cy) + Math.floor(cx / 2)
      if (step < 3) return accent
      return step % 2 ? fg : bg
    }
  }
}

/* ------------------------------------------------------------------ */
/* Compiling                                                           */
/* ------------------------------------------------------------------ */

/** Expands a half warp stripe into ENDS dyes, mirrored about the centre. */
export function warpEnds(draft: StripDraft): Dye[] {
  const half: Dye[] = []
  for (const [dye, count] of draft.warp) for (let k = 0; k < count; k++) half.push(dye)
  while (half.length < ENDS / 2) half.push(half[half.length - 1] ?? Dye.Gold)
  half.length = ENDS / 2
  return [...half, ...half.slice().reverse()]
}

export type CompiledCloth = {
  strips: number
  /** RGBA: warp dye, weft dye, 255 when the weft is on top, block id. */
  structure: Uint8Array
  /** RGBA8 visible colour, for the far view. */
  colour: Uint8Array
  width: number
  height: number
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Lays the strips side by side into one texture, `strips * ENDS` wide and
 * PERIOD tall. Odd strips start half a unit later: the checkerboard offset.
 */
export function compileCloth(drafts: StripDraft[]): CompiledCloth {
  const width = drafts.length * ENDS
  const height = PERIOD
  const structure = new Uint8Array(width * height * 4)
  const colour = new Uint8Array(width * height * 4)
  const palette = DYES.map(rgb)

  drafts.forEach((draft, s) => {
    const ends = warpEnds(draft)
    const offset = s % 2 ? Math.floor(UNIT / 2) : 0
    for (let row = 0; row < height; row++) {
      const pick = (row + offset) % PERIOD
      const unit = Math.floor(pick / UNIT)
      const inUnit = pick % UNIT
      const block = draft.blocks[unit % draft.blocks.length]
      const weftFaced = inUnit >= WARP_PICKS
      for (let x = 0; x < ENDS; x++) {
        const o = (row * width + s * ENDS + x) * 4
        const warp = ends[x]
        const weft = weftFaced ? motifAt(block, x, inUnit - WARP_PICKS) : draft.weft
        structure[o] = warp
        structure[o + 1] = weft
        structure[o + 2] = weftFaced ? 255 : 0
        structure[o + 3] = unit
        // What the eye averages to at a distance: mostly the top thread, a
        // little of the one beneath, a little shadow between.
        const top = palette[weftFaced ? weft : warp]
        const under = palette[weftFaced ? warp : weft]
        for (let c = 0; c < 3; c++) colour[o + c] = Math.round((top[c] * 0.88 + under[c] * 0.12) * 0.86)
        colour[o + 3] = 255
      }
    }
  })

  return { strips: drafts.length, structure, colour, width, height }
}

/* ------------------------------------------------------------------ */
/* The pattern book                                                    */
/* ------------------------------------------------------------------ */

const { Black, Gold, Red, Green, Blue, White, Orange, Maroon } = Dye

/**
 * One strip per chapter of the work, in the order the chapters happened. Each
 * is woven after a named kente design whose meaning fits the chapter; the
 * names and meanings live in public/json/strips.json, next to the copy. These
 * are drafts in the spirit of those cloths, not reproductions of them.
 */
export const PATTERNS: Record<string, StripDraft> = {
  // Ahwepan: plain, the cloth with the fewest motifs. A first job.
  ahwepan: {
    warp: [[Black, 2], [Gold, 5], [Green, 2], [Gold, 5], [Red, 2], [Gold, 8]],
    weft: Gold,
    blocks: [
      { motif: 'plain', fg: Gold, bg: Black, accent: Green },
      { motif: 'bars', fg: Gold, bg: Green, accent: Red },
      { motif: 'plain', fg: Green, bg: Gold, accent: Black },
      { motif: 'bars', fg: Red, bg: Gold, accent: Black },
    ],
  },
  // Abusua ye dom: the family is a force. A team of students.
  abusua: {
    warp: [[Black, 2], [Green, 4], [Gold, 3], [Green, 4], [Gold, 2], [Red, 2], [Gold, 7]],
    weft: Green,
    blocks: [
      { motif: 'check', fg: Gold, bg: Green, accent: Black },
      { motif: 'bars', fg: Gold, bg: Red, accent: Black },
      { motif: 'check', fg: Red, bg: Gold, accent: Green },
      { motif: 'diamond', fg: Gold, bg: Black, accent: Green },
    ],
  },
  // Babadua: a tough, segmented cane. Learning the trade.
  babadua: {
    warp: [[Black, 2], [Red, 3], [Gold, 4], [Red, 3], [Gold, 4], [Black, 2], [Gold, 6]],
    weft: Red,
    blocks: [
      { motif: 'ladder', fg: Gold, bg: Black, accent: Red },
      { motif: 'bars', fg: Gold, bg: Green, accent: Black },
      { motif: 'ladder', fg: Green, bg: Gold, accent: Black },
      { motif: 'steps', fg: Gold, bg: Red, accent: Black },
    ],
  },
  // Sika futuro: gold dust. Commerce.
  sika: {
    warp: [[Black, 2], [Gold, 3], [Black, 1], [Gold, 3], [Orange, 3], [Gold, 3], [Green, 2], [Gold, 7]],
    weft: Gold,
    blocks: [
      { motif: 'dust', fg: Gold, bg: Black, accent: Orange },
      { motif: 'bars', fg: Black, bg: Gold, accent: Red },
      { motif: 'dust', fg: Black, bg: Gold, accent: Green },
      { motif: 'check', fg: Gold, bg: Black, accent: Orange },
    ],
  },
  // Wofro dua pa a: when you climb a good tree, you are given a push.
  wofro: {
    warp: [[Black, 2], [Green, 3], [Gold, 3], [Blue, 2], [Gold, 3], [Green, 3], [Gold, 8]],
    weft: Green,
    blocks: [
      { motif: 'steps', fg: Gold, bg: Green, accent: Black },
      { motif: 'zigzag', fg: Gold, bg: Blue, accent: Green },
      { motif: 'bars', fg: Green, bg: Gold, accent: Black },
      { motif: 'steps', fg: Blue, bg: Gold, accent: Green },
    ],
  },
  // Obaakofoo mmu man: one person does not rule a nation.
  obaakofoo: {
    warp: [[Black, 2], [Blue, 3], [Gold, 3], [Red, 2], [Gold, 3], [Green, 3], [Gold, 8]],
    weft: Blue,
    blocks: [
      { motif: 'diamond', fg: Gold, bg: Blue, accent: Red },
      { motif: 'check', fg: Gold, bg: Green, accent: Black },
      { motif: 'diamond', fg: Red, bg: Gold, accent: Blue },
      { motif: 'bars', fg: Gold, bg: Blue, accent: Green },
    ],
  },
  // Emaa da: it has never happened before. Novelty, invention.
  emaada: {
    warp: [[Black, 2], [Blue, 4], [White, 2], [Gold, 4], [Blue, 3], [Gold, 3], [Red, 1], [Gold, 5]],
    weft: Blue,
    blocks: [
      { motif: 'hourglass', fg: Gold, bg: Blue, accent: Red },
      { motif: 'zigzag', fg: White, bg: Blue, accent: Gold },
      { motif: 'hourglass', fg: Blue, bg: Gold, accent: White },
      { motif: 'check', fg: Gold, bg: Blue, accent: Black },
    ],
  },
  // Adweneasa: my skill is exhausted. Every motif at once; the masterwork.
  adweneasa: {
    warp: [[Black, 2], [Blue, 3], [Gold, 2], [White, 2], [Blue, 3], [Gold, 3], [Maroon, 2], [Blue, 7]],
    weft: Blue,
    blocks: [
      { motif: 'diamond', fg: Gold, bg: Blue, accent: White },
      { motif: 'zigzag', fg: White, bg: Blue, accent: Gold },
      { motif: 'steps', fg: Gold, bg: Maroon, accent: Blue },
      { motif: 'hourglass', fg: Blue, bg: Gold, accent: White },
    ],
  },
}

/** Strip nine: warp strung from every colour so far, not yet named. */
PATTERNS.next = {
  warp: [[Black, 2], [Gold, 3], [Green, 2], [Gold, 2], [Red, 2], [Blue, 3], [White, 1], [Gold, 3], [Blue, 6]],
  weft: Gold,
  blocks: [
    { motif: 'diamond', fg: Gold, bg: Black, accent: Blue },
    { motif: 'zigzag', fg: Gold, bg: Green, accent: White },
    { motif: 'steps', fg: Blue, bg: Gold, accent: Red },
    { motif: 'check', fg: Gold, bg: Blue, accent: Black },
  ],
}

export type PatternId = keyof typeof PATTERNS

/** The default cloth: every chapter's strip, warm (Kumasi) to cool (Boston). */
export const CLOTH_ORDER: PatternId[] = [
  'ahwepan',
  'abusua',
  'babadua',
  'sika',
  'wofro',
  'obaakofoo',
  'emaada',
  'adweneasa',
]
