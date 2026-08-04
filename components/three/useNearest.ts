import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import { getCarState } from '../../lib/car'

/**
 * Index of whichever item the car is closest to, or null if it is not close to
 * any of them.
 *
 * This replaced click-to-expand. Proximity is the honest version of the same
 * idea once driving is the only input: pulling up alongside something is
 * already how you say "this one", and it costs the reader nothing to learn.
 *
 * State changes only when the answer changes — the test itself runs every
 * frame, but a section with nothing nearby never re-renders.
 */
export function useNearest(
  /** World ground positions [x, z], one per item. */
  points: [number, number][],
  radius: number
): number | null {
  const [nearest, setNearest] = useState<number | null>(null)
  const current = useRef<number | null>(null)

  useFrame(() => {
    const car = getCarState()
    if (!car.ready) return

    let best: number | null = null
    let bestDistance = radius * radius

    for (let i = 0; i < points.length; i++) {
      const dx = car.x - points[i][0]
      const dz = car.z - points[i][1]
      const distance = dx * dx + dz * dz
      if (distance < bestDistance) {
        bestDistance = distance
        best = i
      }
    }

    if (best !== current.current) {
      current.current = best
      setNearest(best)
    }
  })

  return nearest
}
