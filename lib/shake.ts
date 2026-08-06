/**
 * How hard the camera has just been hit.
 *
 * The simulation already measures every knock precisely — `playImpact` picks a
 * sample from the impact speed along the contact normal — and then that number
 * was used once, for audio, and thrown away. A collision you can hear and not
 * feel is the reason hitting a stack of crates at full boost reads as a sound
 * effect rather than as an event.
 *
 * A plain mutable value, like `shadowAlpha` and `CarState`: written from a
 * physics callback, read inside `useFrame`, and never the cause of a render.
 */
export const shake = { value: 0 }

/** Matches the audio thresholds in `lib/audio`, so the two agree about what
 *  counts as a knock and what counts as a crash. */
const FLOOR = 1.5
const CEILING = 12

/**
 * Feeds a knock in, in metres per second along the contact normal.
 *
 * Takes the larger of the current and incoming value rather than summing them.
 * A single collision reports twice — once from each body, which is what the
 * cooldown in `lib/audio` exists to collapse — and a pile-up reports once per
 * pair, so adding them up turns driving into a stack of cones into a screen
 * that will not stop moving.
 */
export function addShake(strength: number) {
  if (strength < FLOOR) return
  const force = Math.min(1, (strength - FLOOR) / (CEILING - FLOOR))
  shake.value = Math.max(shake.value, force)
}
