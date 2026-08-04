import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
  focusZone,
  getWorldState,
  toWorld,
  WORLD_YAW,
  ZONES,
  type ZoneId,
} from '../../lib/world'

/**
 * The camera never orbits.
 *
 * It sits at a fixed direction vector from whatever it is looking at and simply
 * follows, easing toward the target each frame. Changing "angle" is a slow
 * 2s power1.inOut glide, and it is the only camera move in the whole site —
 * that restraint is what keeps the world feeling like a diorama you are shown
 * rather than a model you are spinning.
 *
 * The reference is Z-up; these vectors are its angles converted to Y-up.
 */
/**
 * Both angles share the same ground azimuth (WORLD_YAW) and differ only in
 * elevation. That is a hard constraint, not a preference: every piece of ground
 * text is yawed once to square up with the camera, so if focusing also swung
 * the camera sideways, all of the world's type would skew as it moved.
 * Focusing rises and flattens; it never orbits.
 */
const AZIMUTH = { x: Math.sin(WORLD_YAW), z: Math.cos(WORLD_YAW) }

const ANGLES = {
  default: new THREE.Vector3(
    AZIMUTH.x * 1.842,
    1.15,
    AZIMUTH.z * 1.842
  ).normalize(),
  // Same heading, higher and flatter — for reading content.
  focus: new THREE.Vector3(
    AZIMUTH.x * 1.451,
    1.63,
    AZIMUTH.z * 1.451
  ).normalize(),
}

const DISTANCE = { default: 26, zone: 19, item: 11 }
const EASING = 0.15

export default function WorldCamera({ initial }: { initial: ZoneId }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera

  const target = useRef(new THREE.Vector3())
  const targetEased = useRef(new THREE.Vector3())
  const angle = useRef(ANGLES.default.clone())
  const distance = useRef({ value: DISTANCE.default })
  const lastFocusId = useRef<string | null>(null)

  const entryZone = useMemo(() => ZONES[initial], [initial])

  /**
   * Deep links open already framed rather than gliding in from the origin, so
   * the entry zone is applied directly — target, angle and distance all snapped
   * before the first frame, with lastFocusId primed so the frame loop does not
   * then tween away from it.
   */
  useEffect(() => {
    const isEntryZone = entryZone.id !== 'intro'

    let parkAt: [number, number]

    if (isEntryZone) {
      focusZone(entryZone)
      lastFocusId.current = entryZone.id
      angle.current.copy(ANGLES.focus)
      distance.current.value = entryZone.focusDistance ?? DISTANCE.zone
      parkAt = toWorld(entryZone.position, ...entryZone.focusLocal)
    } else {
      lastFocusId.current = null
      angle.current.copy(ANGLES.default)
      distance.current.value = DISTANCE.default
      parkAt = entryZone.position
    }

    const [x, z] = parkAt
    target.current.set(x, 0, z)
    targetEased.current.copy(target.current)
    camera.position
      .copy(targetEased.current)
      .add(angle.current.clone().multiplyScalar(distance.current.value))
    camera.lookAt(targetEased.current)
  }, [camera, entryZone])

  useFrame(() => {
    const { focus } = getWorldState()
    const focusId = focus?.id ?? null

    if (focusId !== lastFocusId.current) {
      lastFocusId.current = focusId

      // Clearing focus returns to the intro overview, which is the world's
      // home position regardless of which route you arrived on.
      const [x, z] = focus ? focus.position : ZONES.intro.position
      target.current.set(x, 0, z)

      const nextAngle = focus ? ANGLES.focus : ANGLES.default
      const nextDistance = focus
        ? (focus.distance ??
          (focus.scope === 'item' ? DISTANCE.item : DISTANCE.zone))
        : DISTANCE.default

      gsap.to(angle.current, {
        x: nextAngle.x,
        y: nextAngle.y,
        z: nextAngle.z,
        duration: 2,
        ease: 'power1.inOut',
        overwrite: true,
      })
      gsap.to(distance.current, {
        value: nextDistance,
        duration: 2,
        ease: 'power1.inOut',
        overwrite: true,
      })
    }

    targetEased.current.lerp(target.current, EASING)

    camera.position
      .copy(targetEased.current)
      .add(
        angle.current.clone().normalize().multiplyScalar(distance.current.value)
      )
    camera.lookAt(targetEased.current)
  })

  return null
}
