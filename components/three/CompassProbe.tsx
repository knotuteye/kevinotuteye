import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { getCarState } from '../../lib/car'
import { COMPASS_FADE, compassMarkers, compassState } from '../../lib/compass'
import { getWorldState, INTRO_SPAWN, ZONES } from '../../lib/world'

/**
 * Projects every zone into screen space, once per frame, for the DOM compass.
 *
 * It lives inside the canvas because that is where the camera is, and writes
 * into a shared mutable array rather than into state — see `lib/compass`. The
 * component renders nothing at all; it exists to be somewhere `useFrame` and
 * `useThree` are both legal.
 */

/** Aimed at the floating zone label rather than at the floor, so a chevron
 *  points where the eye will actually find the marker. */
const MARKER_HEIGHT = 1.6

export default function CompassProbe() {
  const camera = useThree((state) => state.camera)
  const scratch = useMemo(() => new THREE.Vector3(), [])
  const view = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const car = getCarState()
    if (!car.ready) return

    const { activeZone } = getWorldState()

    // Picks up exactly where the painted signposts leave off.
    const fromSpawn = Math.hypot(car.x - INTRO_SPAWN[0], car.z - INTRO_SPAWN[1])
    compassState.strength = Math.min(
      1,
      Math.max(
        0,
        (fromSpawn - COMPASS_FADE.start) /
          (COMPASS_FADE.end - COMPASS_FADE.start)
      )
    )

    for (const marker of compassMarkers) {
      const zone = ZONES[marker.id]
      const [zx, zz] = zone.position

      marker.distance = Math.hypot(zx - car.x, zz - car.z)

      /**
       * Behind the camera has to be tested in view space, not inferred from the
       * projected point.
       *
       * `project` divides by w, and w is negative behind the camera — so a zone
       * directly astern comes back with its NDC mirrored through the origin and
       * looks, to any bounds test, like a zone in front on the opposite side.
       * A chevron for the section you have just driven past would then point
       * forward, which is worse than no chevron at all.
       */
      view.set(zx, MARKER_HEIGHT, zz).applyMatrix4(camera.matrixWorldInverse)
      const behind = view.z > 0

      scratch.set(zx, MARKER_HEIGHT, zz).project(camera)

      if (behind) {
        // Undo the mirroring so the direction is honest; the point is off
        // screen either way, and only its bearing is used.
        marker.x = -scratch.x
        marker.y = -scratch.y
      } else {
        marker.x = scratch.x
        marker.y = scratch.y
      }

      marker.onScreen =
        !behind &&
        Math.abs(scratch.x) <= 0.94 &&
        Math.abs(scratch.y) <= 0.9 &&
        // The zone you are standing in never needs pointing at, even in the
        // moment its marker slides off the top of the frame as you drive in.
        marker.id !== activeZone

      marker.live = true
    }
  })

  return null
}
