import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CAR, getCarState } from '../../lib/car'
import { actions } from '../../lib/controls'
import { world } from '../../lib/palette'

/**
 * The marks the car leaves behind it.
 *
 * A driving world that records nothing about having been driven through is the
 * quietest thing missing from this site: you can cross a hundred metres of
 * plain and the plain is exactly as it was. Tyre marks fix that twice over —
 * they make the car feel like it has weight on the floor, and on a map this
 * empty they double as breadcrumbs, because "I have already been down there" is
 * otherwise unanswerable.
 *
 * Built as a fixed ring buffer of quads in one geometry rather than as decals
 * or a growing ribbon. The count is the memory budget and it never moves: at
 * `STEP` metres apart, `QUADS` covers about 90m of driving per wheel before the
 * oldest mark is overwritten, which is roughly the distance at which the fade
 * has taken it anyway.
 */

/** Per wheel. Two wheels lay marks, so the buffer holds twice this. */
const QUADS = 360
const TOTAL = QUADS * 2

/** Distance the car must cover before the next pair of stamps. */
const STEP = 0.42

const MARK = { width: 0.24, length: 0.52 }

/**
 * Under the contact shadows, which sit at 0.010 and up.
 *
 * All of these are transparent with `depthWrite` off, so what decides the order
 * is the painter's sort — and the camera is always above, so a lower quad is
 * further away and draws first. Which is what a mark on the ground under a
 * shadow should do.
 */
const HEIGHT = 0.008

/** Seconds a mark takes to disappear. Long enough to still be there when you
 *  drive back, short enough that the plain is not permanently scribbled on. */
const LIFE = 26

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uLife;
  attribute float aBirth;
  attribute float aStrength;
  varying float vFade;

  void main() {
    float age = uTime - aBirth;
    // Unstamped slots carry birth 0 and sit at the origin as degenerate
    // triangles; at uTime far past uLife they fade to nothing and are discarded
    // below, so the buffer costs nothing until it is written.
    vFade = ( 1.0 - clamp( age / uLife, 0.0, 1.0 ) ) * aStrength;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha;
  varying float vFade;

  void main() {
    float alpha = vFade * uAlpha;
    if ( alpha < 0.003 ) discard;
    gl_FragColor = vec4( uColor, alpha );
  }
`

export default function TireTracks() {
  const head = useRef(0)
  const lastX = useRef(0)
  const lastZ = useRef(0)
  const started = useRef(false)
  const clock = useRef(0)

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(TOTAL * 4 * 3)
    const births = new Float32Array(TOTAL * 4)
    const strengths = new Float32Array(TOTAL * 4)
    const indices = new Uint16Array(TOTAL * 6)

    for (let quad = 0; quad < TOTAL; quad++) {
      const v = quad * 4
      const i = quad * 6
      indices[i] = v
      indices[i + 1] = v + 1
      indices[i + 2] = v + 2
      indices[i + 3] = v
      indices[i + 4] = v + 2
      indices[i + 5] = v + 3
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aBirth', new THREE.BufferAttribute(births, 1))
    geo.setAttribute('aStrength', new THREE.BufferAttribute(strengths, 1))
    geo.setIndex(new THREE.BufferAttribute(indices, 1))
    // The marks are scattered across the whole map, so any bounding volume
    // derived from the buffer's initial state would cull the lot.
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6)

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uLife: { value: LIFE },
        uColor: { value: new THREE.Color(world.indirect) },
        uAlpha: { value: 0.42 },
      },
    })

    return { geometry: geo, material: mat }
  }, [])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material]
  )

  useFrame((_, delta) => {
    clock.current += delta
    material.uniforms.uTime.value = clock.current

    const car = getCarState()
    if (!car.ready) return

    if (!started.current) {
      started.current = true
      lastX.current = car.x
      lastZ.current = car.z
      return
    }

    // Airborne wheels leave nothing. Without this a jump paints a strip of
    // marks along the ground beneath the arc.
    if (!car.grounded) {
      lastX.current = car.x
      lastZ.current = car.z
      return
    }

    const moved = Math.hypot(car.x - lastX.current, car.z - lastZ.current)
    if (moved < STEP) return

    // A reset teleports the car; without this the jump home draws one enormous
    // smear from wherever it was straight back to the spawn.
    if (moved > STEP * 12) {
      lastX.current = car.x
      lastZ.current = car.z
      return
    }

    lastX.current = car.x
    lastZ.current = car.z

    /**
     * How dark the mark is.
     *
     * Speed alone would make a boost down an empty straight the most dramatic
     * thing the tyres ever do, which is backwards — that is the one moment they
     * are gripping cleanly. Braking and hard steering are what actually scrub
     * rubber off, so they carry most of the weight here.
     */
    const speed = Math.min(1, Math.abs(car.speed) / CAR.controlsAcceleratingMaxSpeed)
    const scrubbing =
      (actions.brake ? 0.75 : 0) +
      (actions.left || actions.right ? 0.3 : 0) +
      (actions.boost ? 0.2 : 0)
    const strength = Math.min(1, 0.22 + speed * 0.35 + scrubbing * speed)

    const positions = geometry.attributes.position.array as Float32Array
    const births = geometry.attributes.aBirth.array as Float32Array
    const strengths = geometry.attributes.aStrength.array as Float32Array

    // Forward and its perpendicular on the ground, both unit length.
    const fx = car.dirX
    const fz = car.dirZ
    const rx = fz
    const rz = -fx

    for (const side of [-1, 1]) {
      // Where the rear wheel actually is: back along the chassis to the rear
      // axle, then out to that side of it.
      const cx =
        car.x + fx * CAR.wheelBackOffsetDepth + rx * CAR.wheelOffsetWidth * side
      const cz =
        car.z + fz * CAR.wheelBackOffsetDepth + rz * CAR.wheelOffsetWidth * side

      const hx = fx * MARK.length * 0.5
      const hz = fz * MARK.length * 0.5
      const wx = rx * MARK.width * 0.5
      const wz = rz * MARK.width * 0.5

      const quad = head.current
      head.current = (head.current + 1) % TOTAL

      const v = quad * 4 * 3
      const corners: [number, number][] = [
        [cx - hx - wx, cz - hz - wz],
        [cx + hx - wx, cz + hz - wz],
        [cx + hx + wx, cz + hz + wz],
        [cx - hx + wx, cz - hz + wz],
      ]

      for (let c = 0; c < 4; c++) {
        positions[v + c * 3] = corners[c][0]
        positions[v + c * 3 + 1] = HEIGHT
        positions[v + c * 3 + 2] = corners[c][1]
        births[quad * 4 + c] = clock.current
        strengths[quad * 4 + c] = strength
      }
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.aBirth.needsUpdate = true
    geometry.attributes.aStrength.needsUpdate = true
  })

  return <mesh geometry={geometry} material={material} frustumCulled={false} />
}
