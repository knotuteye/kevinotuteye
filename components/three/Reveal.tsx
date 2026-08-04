import gsap from 'gsap'
import { useEffect } from 'react'
import { revealUniforms } from './materials/clay'

/**
 * The load reveal. A radial wave sweeps outward from the world origin and the
 * clay material clips anything still below the ground plane, so the world
 * grows out of the floor over three seconds. Shadows follow half a second
 * behind, which is what sells the objects as landing rather than appearing.
 */
export default function Reveal({
  shadowAlpha,
}: {
  shadowAlpha: { value: number }
}) {
  useEffect(() => {
    revealUniforms.uRevealProgress.value = 0
    shadowAlpha.value = 0

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
  }, [shadowAlpha])

  return null
}
