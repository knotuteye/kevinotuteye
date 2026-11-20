import { colors } from '../Theme'

/**
 * The weave: a kente-like cloth generated from how kente is actually made.
 *
 * Kente is woven in narrow strips that are sewn side by side. Along each strip,
 * warp-faced bands (lengthwise pinstripes) alternate with weft-faced blocks
 * (crosswise bars, checks, solid colour), and neighbouring strips are offset
 * by half a block, which gives the cloth its checkerboard rhythm.
 *
 * This module is the single model behind both renderers: the CSS weave (server
 * rendered, and the fallback) and the WebGL weave (components/weave/gl.ts).
 * Both read the same cells, so the canvas can replace the DOM without the
 * pattern changing under the visitor.
 */

export const THREADS = [
  colors.gold,
  colors.red,
  colors.leaf,
  colors.indigo,
  colors.ink,
  colors.cotton,
] as const

/** Index into THREADS. Plain objects, not enums, so SWC and tsc agree. */
export const Thread = {
  Gold: 0,
  Red: 1,
  Leaf: 2,
  Indigo: 3,
  Ink: 4,
  Cotton: 5,
} as const
export type Thread = (typeof Thread)[keyof typeof Thread]

export const Kind = {
  Warp: 0,
  Weft: 1,
  Check: 2,
  Solid: 3,
} as const
export type Kind = (typeof Kind)[keyof typeof Kind]

/** Warm (Kumasi) and cool (Boston) thread pools. Duplicates set the odds. */
const WARM: Thread[] = [Thread.Gold, Thread.Gold, Thread.Red, Thread.Leaf]
const COOL: Thread[] = [Thread.Indigo, Thread.Indigo, Thread.Leaf, Thread.Gold]

/**
 * Cell order along a strip. Even strips start on a warp band, odd strips on a
 * check block, so blocks land opposite bands across every seam. Both sequences
 * add up to 15 units, which the shader relies on to find a cell without a loop.
 */
const SEQ_EVEN: Kind[] = [Kind.Warp, Kind.Weft, Kind.Warp, Kind.Check, Kind.Warp, Kind.Solid]
const SEQ_ODD: Kind[] = [Kind.Check, Kind.Warp, Kind.Solid, Kind.Warp, Kind.Weft, Kind.Warp]

export const PERIOD_UNITS = 15

export type Cell = {
  kind: Kind
  /** Height in units: warp bands are 3, blocks are 2. */
  units: 2 | 3
  warm: Thread
  cool: Thread
  /** 0..1. A cell is cool when `r` is below the strip's warmth. */
  r: number
}

export type Strip = Cell[]

/** mulberry32: small, fast and deterministic, so server and client agree. */
export function rng(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Builds a cloth of `strips` x `rows` cells. Rows should be a multiple of 6 so
 * that the pattern tiles cleanly when the WebGL renderer wraps it.
 */
export function weaveModel(strips: number, rows: number, seed: number): Strip[] {
  const random = rng(seed)
  const cloth: Strip[] = []
  for (let i = 0; i < strips; i++) {
    const seq = i % 2 ? SEQ_ODD : SEQ_EVEN
    const strip: Strip = []
    for (let j = 0; j < rows; j++) {
      const kind = seq[j % seq.length]
      strip.push({
        kind,
        units: kind === Kind.Warp ? 3 : 2,
        r: random(),
        warm: WARM[Math.floor(random() * WARM.length)],
        cool: COOL[Math.floor(random() * COOL.length)],
      })
    }
    cloth.push(strip)
  }
  return cloth
}

/** How cool strip `i` of `n` is, running from `from` (left) to `to` (right). */
export function stripWarmth(i: number, n: number, from: number, to: number) {
  return n > 1 ? from + ((to - from) * i) / (n - 1) : from
}

export function cellThread(cell: Cell, warmth: number): Thread {
  return cell.r < warmth ? cell.cool : cell.warm
}

/**
 * The CSS for one cell. The shader in components/weave/gl.ts draws exactly
 * these patterns; change one and change the other.
 */
export function cellBackground(kind: Kind, thread: Thread): string {
  const a = THREADS[thread]
  const ink = colors.ink
  const cotton = colors.cotton
  switch (kind) {
    case Kind.Warp:
      return `repeating-linear-gradient(90deg,${a} 0 3px,${ink} 3px 5px,${a} 5px 9px,${cotton} 9px 10px)`
    case Kind.Weft:
      return `repeating-linear-gradient(180deg,${a} 0 5px,${ink} 5px 8px)`
    case Kind.Check:
      return `repeating-conic-gradient(${a} 0 25%,${ink} 0 50%) 0 0/10px 10px`
    default:
      return a
  }
}

/** Odd strips sit one unit higher than even ones: the half-block offset. */
export function stripOffsetUnits(i: number) {
  return i % 2 ? -1 : 0
}
