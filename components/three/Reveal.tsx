import gsap from 'gsap'
import { useEffect } from 'react'
import { useWorldReady } from '../../lib/loading'
import { revealUniforms } from './materials/clay'

/**
 * The load reveal. A radial wave sweeps outward from the world origin and the
 * clay material clips anything still below the ground plane, so the world
 * grows out of the floor over three seconds. Shadows follow half a second
 * behind, which is what sells the objects as landing rather than appearing.
 *
 * Held until the loading curtain starts to lift. It used to run on mount, which
 * meant it played out underneath an opaque overlay and was finished by the time
 * anyone could see it — three seconds of the best animation on the site, spent
 * behind a door. See `lib/loading`.
 */
export default function Reveal({
  shadowAlpha,
}: {
  shadowAlpha: { value: number }
}) {
  const ready = useWorldReady()

  useEffect(() => {
    // Parked below the floor from the first frame rather than only when the
    // tween starts, so the world is already hidden when the curtain clears
    // instead of visibly dropping down to begin.
    revealUniforms.uRevealProgress.value = 0
    shadowAlpha.value = 0

    if (!ready) return

    const tweens = [
      gsap.to(revealUniforms.uRevealProgress, {
        value: 1,
        duration: 3,
        ease: 'none',
      }),
      gsap.to(shadowAlpha, {
        value: 0.85,
        duration: 3,
        delay: 0.5,
        ease: 'none',
      }),
    ]

    return () => tweens.forEach((t) => t.kill())
  }, [shadowAlpha, ready])

  return null
}
