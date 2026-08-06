import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CAR, getCarState } from '../../lib/car'
import { actions } from '../../lib/controls'
import { world } from '../../lib/palette'
import { mulberry32 } from '../../lib/rng'

/**
 * What the back wheels throw up.
 *
 * The impacts are already audible and the tyre marks are already on the floor;
 * this is the third of the same idea and the only one that happens *above* the
 * ground, which is what makes a launch read as effort. It fires on the two
 * things that actually break traction — pulling away and scrubbing through a
 * corner — and not on cruising, so a car crossing the plain at a steady speed
 * is as clean as it should be.
 *
 * The whole simulation runs in the vertex shader. A particle's position is a
 * pure function of where it was born, the velocity it was born with, and how
 * long ago that was, so the CPU writes four numbers at spawn and then never
 * touches it again — which is why a pool this size costs nothing per frame.
 */

const COUNT = 220
/** Seconds a puff lasts. */
const LIFE = 1.15
/** Particle diameter in metres, before the size falls off with distance. */
const SIZE = 0.34

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uLife;
  uniform float uSize;
  uniform float uViewHeight;

  attribute vec3 aVelocity;
  attribute float aBirth;
  attribute float aSeed;

  varying float vFade;

  void main() {
    float age = uTime - aBirth;
    float t = clamp( age / uLife, 0.0, 1.0 );

    // Drag, as a straight taper on the distance travelled rather than a real
    // integration — dust stops moving almost at once and nobody can tell which
    // curve it stopped on.
    vec3 pos = position + aVelocity * age * ( 1.0 - 0.45 * t );
    pos.y += age * 0.35 * ( 1.0 - t );

    // Fades in over the first tenth of its life so a puff does not pop into
    // existence at full opacity on the frame it is spawned.
    vFade = smoothstep( 0.0, 0.1, t ) * ( 1.0 - t ) * ( 1.0 - t );

    vec4 mvPosition = modelViewMatrix * vec4( pos, 1.0 );

    // Grows as it disperses, which is most of why a handful of dots reads as
    // dust rather than as sparks.
    float size = uSize * ( 0.55 + t * 1.5 ) * ( 0.75 + aSeed * 0.5 );
    gl_PointSize = size * uViewHeight / max( -mvPosition.z, 0.001 );

    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha;
  varying float vFade;

  void main() {
    // Soft round puff. gl_PointCoord runs 0..1 across the sprite.
    float d = length( gl_PointCoord - 0.5 ) * 2.0;
    float mask = 1.0 - smoothstep( 0.35, 1.0, d );
    float alpha = mask * vFade * uAlpha;
    if ( alpha < 0.004 ) discard;
    gl_FragColor = vec4( uColor, alpha );
  }
`

export default function Dust() {
  const head = useRef(0)
  const clock = useRef(0)
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  const height = useThree((state) => state.size.height)

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const velocities = new Float32Array(COUNT * 3)
    const births = new Float32Array(COUNT)
    const seeds = new Float32Array(COUNT)

    // Born long ago, so nothing is visible until something is actually spawned.
    births.fill(-LIFE * 10)

    // Seeded rather than `Math.random`, like the scenery: this runs during
    // render, where an impure call would hand two different pools to the two
    // passes of a StrictMode mount. The per-particle value only breaks up the
    // sprite sizes, so any fixed sequence does the job.
    const rand = mulberry32(9)
    for (let i = 0; i < COUNT; i++) seeds[i] = rand()

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3))
    geo.setAttribute('aBirth', new THREE.BufferAttribute(births, 1))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6)

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uLife: { value: LIFE },
        uSize: { value: SIZE },
        uViewHeight: { value: 500 },
        uColor: { value: new THREE.Color(world.bone) },
        uAlpha: { value: 0.5 },
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

    // The projected size of a one-metre sprite at one metre, in pixels — what
    // turns a world-space diameter into a gl_PointSize. Recomputed per frame
    // rather than on resize because the camera's FOV is no longer constant: it
    // opens up with speed, and dust sized against the resting lens would shrink
    // slightly every time the car pulled away.
    material.uniforms.uViewHeight.value =
      height / (2 * Math.tan((camera.fov * Math.PI) / 360))

    const car = getCarState()
    if (!car.ready || !car.grounded) return

    const speed = Math.abs(car.speed) / CAR.controlsAcceleratingMaxSpeed

    /**
     * Traction is being broken, rather than merely being used.
     *
     * Pulling away is the case worth catching and it is the one a speed test
     * misses entirely — the throttle is wide open and the car has not moved
     * yet, which is exactly when a real wheel spins.
     */
    const launching = actions.up && speed < 0.55
    const cornering = (actions.left || actions.right) && speed > 0.35
    const sliding = actions.brake && speed > 0.25

    if (!launching && !cornering && !sliding && !(actions.boost && speed > 0.6)) {
      return
    }

    const positions = geometry.attributes.position.array as Float32Array
    const velocities = geometry.attributes.aVelocity.array as Float32Array
    const births = geometry.attributes.aBirth.array as Float32Array

    const fx = car.dirX
    const fz = car.dirZ
    const rx = fz
    const rz = -fx

    // Two per frame, one behind each rear wheel.
    for (const side of [-1, 1]) {
      const cx =
        car.x + fx * CAR.wheelBackOffsetDepth + rx * CAR.wheelOffsetWidth * side
      const cz =
        car.z + fz * CAR.wheelBackOffsetDepth + rz * CAR.wheelOffsetWidth * side

      const i = head.current
      head.current = (head.current + 1) % COUNT

      positions[i * 3] = cx + (Math.random() - 0.5) * 0.12
      positions[i * 3 + 1] = 0.06
      positions[i * 3 + 2] = cz + (Math.random() - 0.5) * 0.12

      // Thrown backwards off the wheel and out to the side, with the spread
      // widening as the car goes faster.
      const back = 0.7 + speed * 1.5
      const out = (0.35 + Math.random() * 0.5) * side
      velocities[i * 3] = -fx * back + rx * out + (Math.random() - 0.5) * 0.3
      velocities[i * 3 + 1] = 0.25 + Math.random() * 0.4
      velocities[i * 3 + 2] = -fz * back + rz * out + (Math.random() - 0.5) * 0.3

      births[i] = clock.current
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.aVelocity.needsUpdate = true
    geometry.attributes.aBirth.needsUpdate = true
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}
