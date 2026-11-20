/**
 * The loom: the page transition.
 *
 * Strips fall in from alternate ends like warp threads, lock into cloth, then
 * keep moving to show the next page. The overlay (components/Loom.tsx) is pure
 * CSS driven by a `data-phase` attribute; this module owns the phase and the
 * timing, and _app awaits it to swap pages while the screen is covered.
 *
 *   intro  → first load: CSS-only lift, works without JavaScript
 *   idle   → hidden, strips parked off-screen at their entry side
 *   cover  → strips drop in and lock
 *   reveal → strips carry on through and off the other side
 */

export type LoomPhase = 'intro' | 'idle' | 'cover' | 'reveal'

/** Keep in step with the .loom rules in styles/globals.css. */
export const LOOM = {
  duration: 450,
  stagger: 18,
  introDelay: 450,
} as const

let phase: LoomPhase = 'intro'
const listeners = new Set<() => void>()

function set(next: LoomPhase) {
  if (phase === next) return
  phase = next
  listeners.forEach((fn) => fn())
}

export function getLoomPhase(): LoomPhase {
  return phase
}

export function getServerLoomPhase(): LoomPhase {
  return 'intro'
}

export function subscribeLoom(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Strips on screen at this width. Matches the nth-child rules in the CSS. */
function visibleStrips(): number {
  const w = window.innerWidth
  return w < 640 ? 8 : w < 1024 ? 12 : 20
}

function totalMs(): number {
  return LOOM.duration + LOOM.stagger * (visibleStrips() - 1)
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Covers the screen. Resolves once every strip has locked. */
export async function cover(): Promise<void> {
  if (prefersReducedMotion()) return
  set('cover')
  await wait(totalMs() + 30)
}

/** Lifts the cloth to show the page underneath. */
export async function reveal(): Promise<void> {
  if (prefersReducedMotion() || phase !== 'cover') return
  set('reveal')
  await wait(totalMs() + 30)
  if (getLoomPhase() === 'reveal') set('idle')
}

/** Called once the first-load lift has played. */
export function endIntro(): void {
  if (phase === 'intro') set('idle')
}

export function introMs(): number {
  return LOOM.introDelay + totalMs()
}
