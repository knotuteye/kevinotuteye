import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getCarState } from '../../lib/car'
import { getWorldState, WORLD_YAW, ZONES, type ZoneId } from '../../lib/world'

/**
 * The camera never orbits. It chases.
 *
 * It sits at a fixed direction vector from the car and eases toward it every
 * frame. There is no orbit, no free look and no user-facing camera control at
 * all — the only thing that changes is elevation, and only when the car enters
 * a zone. That restraint is what keeps the world feeling like a diorama you are
 * driving through rather than a model you are spinning.
 *
 * The reference is Z-up; these vectors are its angles converted to Y-up.
 */
/**
 * Both angles share the same ground azimuth (WORLD_YAW) and differ only in
 * elevation. That is a hard constraint, not a preference: every piece of ground
 * text is yawed once to square up with the camera, so if entering a zone also
 * swung the camera sideways, all of the world's type would skew as it moved.
 * Arriving rises and flattens; it never orbits.
 */
const AZIMUTH = { x: Math.sin(WORLD_YAW), z: Math.cos(WORLD_YAW) }

const ANGLES = {
  default: new THREE.Vector3(
    AZIMUTH.x * 1.842,
    1.15,
    AZIMUTH.z * 1.842
  ).normalize(),
  // Same heading, higher and flatter — for reading content.
  zone: new THREE.Vector3(AZIMUTH.x * 1.451, 1.63, AZIMUTH.z * 1.451).normalize(),
}

/**
 * One follow distance, not a per-zone one. A section-sized pull-back would be
 * right for reading a whole board at once and quite wrong for the thing the
 * camera is actually tracking, which is a two-metre car.
 */
const DISTANCE = 24

/** Low enough to feel attached to the car, high enough not to jitter with the
 *  suspension. Ground position only — following height would bob on every bump. */
const EASING = 0.08

export default function WorldCamera({ entry }: { entry: ZoneId }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera

  const target = useRef(new THREE.Vector3())
  const targetEased = useRef(new THREE.Vector3())
  const angle = useRef(ANGLES.default.clone())
  const lastZone = useRef<ZoneId | null>(null)

  const entryZone = useMemo(() => ZONES[entry], [entry])

  /**
   * Deep links open already framed rather than gliding in from the origin. The
   * car spawns on the same spot, so this only has to avoid one jarring frame
   * before the first physics step publishes a position.
   */
  useEffect(() => {
    const [x, z] = entryZone.position
    target.current.set(x, 0, z)
    targetEased.current.copy(target.current)
    angle.current.copy(
      entryZone.id === 'intro' ? ANGLES.default : ANGLES.zone
    )
    lastZone.current = entryZone.id === 'intro' ? null : entryZone.id
    camera.position
      .copy(targetEased.current)
      .add(angle.current.clone().multiplyScalar(DISTANCE))
    camera.lookAt(targetEased.current)
  }, [camera, entryZone])

  useFrame(() => {
    const car = getCarState()
    if (car.ready) {
      target.current.set(car.x, 0, car.z)
    }

    const { activeZone } = getWorldState()
    if (activeZone !== lastZone.current) {
      lastZone.current = activeZone
      const next = activeZone ? ANGLES.zone : ANGLES.default
      gsap.to(angle.current, {
        x: next.x,
        y: next.y,
        z: next.z,
        duration: 2,
        ease: 'power1.inOut',
        overwrite: true,
      })
    }

    targetEased.current.lerp(target.current, EASING)

    camera.position
      .copy(targetEased.current)
      .add(angle.current.clone().normalize().multiplyScalar(DISTANCE))
    camera.lookAt(targetEased.current)
  })

  return null
}
