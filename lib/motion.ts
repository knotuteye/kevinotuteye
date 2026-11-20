import { useSyncExternalStore } from 'react'

/** True when the visitor has asked for less motion. Safe on the server. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** Maps v from [a, b] onto 0..1, clamped. */
export const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a))
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribeMotion(fn: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', fn)
  return () => mq.removeEventListener('change', fn)
}

/** React hook form of prefersReducedMotion, false on the server. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => false)
}
