import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CAR, getCarState } from '../../lib/car'
import { shake } from '../../lib/shake'
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
 *
 * It does move with speed, and that is the one exception worth making. A rig
 * whose framing is identical at a standstill and at full boost gives the driver
 * no feedback at all for the only continuous quantity they control — the engine
 * pitch was carrying that on its own. Widening the lens and easing back does
 * two things at once: the edges of frame start to move, which is where speed is
 * actually read, and more of the world ahead comes into view exactly when the
 * car is covering ground fast enough to need it.
 *
 * Both ends are deliberately narrow. This is a diorama, and a camera that
 * lurches between two framings would break the stillness that makes it one.
 */
const DISTANCE = { idle: 24, fast: 27.5 }
const FOV = { idle: 40, fast: 47 }

/** Speed the widening is measured against — the boosted top speed, so an
 *  unboosted cruise sits partway up rather than pinned at the far end. */
const TOP_SPEED = CAR.controlsAcceleratingMaxSpeedBoost

/** Per-frame easing on the framing. Slower than the position follow: the rig
 *  should breathe with the throttle, not snap to it. */
const FRAMING_EASING = 0.045

/** Metres the camera is thrown by a full-strength knock. */
const SHAKE_AMPLITUDE = 0.55
/** Knocks fall away in about a third of a second. */
const SHAKE_DECAY = 7

/** Low enough to feel attached to the car, high enough not to jitter with the
 *  suspension. Ground position only — following height would bob on every bump. */
const EASING = 0.08

export default function WorldCamera({ entry }: { entry: ZoneId }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera

  const target = useRef(new THREE.Vector3())
  const targetEased = useRef(new THREE.Vector3())
  const angle = useRef(ANGLES.default.clone())
  const lastZone = useRef<ZoneId | null>(null)
  /** 0 at a standstill, 1 at the boosted top speed, eased. */
  const pace = useRef(0)
  const offset = useRef(new THREE.Vector3())
  const elapsed = useRef(0)

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
      .add(angle.current.clone().multiplyScalar(DISTANCE.idle))
    camera.fov = FOV.idle
    camera.updateProjectionMatrix()
    camera.lookAt(targetEased.current)
  }, [camera, entryZone])

  useFrame((_, delta) => {
    elapsed.current += delta

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

    // Eased rather than read straight off the car: `speed` is recomputed from a
    // position delta every step and jitters over bumps, and a lens that tracked
    // it exactly would pump on every kerb.
    const wanted = car.ready ? Math.min(1, Math.abs(car.speed) / TOP_SPEED) : 0
    pace.current += (wanted - pace.current) * FRAMING_EASING

    const distance = DISTANCE.idle + (DISTANCE.fast - DISTANCE.idle) * pace.current
    const fov = FOV.idle + (FOV.fast - FOV.idle) * pace.current

    if (Math.abs(camera.fov - fov) > 0.001) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }

    camera.position
      .copy(targetEased.current)
      .add(angle.current.clone().normalize().multiplyScalar(distance))
    camera.lookAt(targetEased.current)

    /**
     * The knock, applied after `lookAt` and to the position only.
     *
     * Rotating the camera would swing the whole world about the centre of frame
     * and read as the car being spun; translating a rig whose orientation has
     * already been fixed reads as the camera itself being jolted, which is what
     * happened. Three incommensurate frequencies so a run of hits in quick
     * succession never lands on the same wobble twice.
     */
    if (shake.value > 0.002) {
      const t = elapsed.current
      const amount = shake.value * SHAKE_AMPLITUDE
      offset.current.set(
        Math.sin(t * 57.3),
        Math.sin(t * 71.9),
        Math.cos(t * 63.1)
      )
      camera.position.addScaledVector(offset.current, amount)
      shake.value *= Math.exp(-delta * SHAKE_DECAY)
    } else {
      shake.value = 0
    }
  })

  return null
}
