import { prefersReducedMotion } from './motion'

/**
 * The page change. Strips of cloth drop in from alternate ends, lock edge to
 * edge, and carry on through to show the next page. The overlay
 * (components/Transition.tsx) draws them; this module owns the phase and the
 * timing, and _app awaits it to swap pages while the screen is covered.
 *
 *   idle   → nothing on screen
 *   cover  → strips drop in and lock
 *   reveal → strips carry on and leave by the other end
 */

export type Phase = 'idle' | 'cover' | 'reveal'

export const TIMING = { duration: 720, stagger: 55 } as const

let phase: Phase = 'idle'
let started = 0
const listeners = new Set<() => void>()

function set(next: Phase) {
  if (phase === next) return
  phase = next
  started = typeof performance !== 'undefined' ? performance.now() : 0
  listeners.forEach((fn) => fn())
}

export const getPhase = () => phase
export const getServerPhase = (): Phase => 'idle'
/** When the current phase began, from performance.now(). */
export const phaseStart = () => started

export function subscribePhase(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** Strips on screen at this width; the overlay draws the same number. */
export function stripCount(): number {
  const w = typeof window === 'undefined' ? 1440 : window.innerWidth
  return w < 640 ? 4 : w < 1024 ? 6 : 8
}

export function totalMs(): number {
  return TIMING.duration + TIMING.stagger * (stripCount() - 1)
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Covers the screen. Resolves once every strip has locked. */
export async function cover(): Promise<void> {
  if (prefersReducedMotion()) return
  set('cover')
  await wait(totalMs() + 40)
}

/** Lifts the cloth to show the page underneath. */
export async function reveal(): Promise<void> {
  if (prefersReducedMotion() || phase !== 'cover') return
  set('reveal')
  await wait(totalMs() + 40)
  if (getPhase() === 'reveal') set('idle')
}
