/**
 * Deterministic RNG.
 *
 * Scatter positions must be stable across renders and reloads — the world
 * should look hand-placed, not reshuffle every time it mounts. mulberry32 is
 * small, fast and good enough for placing rocks.
 */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Random float in [min, max). */
export function range(rand: () => number, min: number, max: number) {
  return min + rand() * (max - min)
}
