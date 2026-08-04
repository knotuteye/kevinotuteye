import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { world } from '../../lib/palette'

/**
 * Contact shadows without shadow maps.
 *
 * Every object gets a manually placed quad on the ground with a procedural
 * rounded-rect falloff, tinted with `world.indirect` — the same value used for
 * the bounce light in the clay material. Rendering real shadows for a scene
 * with no lights would be both impossible and far more expensive; this is the
 * trick that makes the whole diorama affordable.
 */

/** Shared so the reveal can fade every shadow in at once. */
export const shadowAlpha = { value: 0 }

/**
 * The virtual sun. Nothing in the scene is lit by it — it exists only to
 * decide which way shadows slide, and it matches the key direction baked into
 * the matcap generator so the two agree.
 */
const SUN = { x: -0.45, y: 0.72, z: -0.62 }

/** How far a shadow slides from an object sitting at `height`. */
export function shadowOffsetFor(height: number): [number, number] {
  return [(-SUN.x / SUN.y) * height, (-SUN.z / SUN.y) * height]
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`

const fragmentShader = /* glsl */ `
  #define M_PI 3.1415926535897932384626433832795

  uniform vec3 uColor;
  uniform float uAlpha;
  uniform float uSoftness;
  varying vec2 vUv;

  void main() {
    vec2 p = abs( vUv - 0.5 ) * 2.0;
    float d = length( max( p - uSoftness, 0.0 ) ) / max( 1.0 - uSoftness, 0.0001 );
    float strength = 1.0 - clamp( d, 0.0, 1.0 );

    // sineInOut — a linear falloff reads as a hard disc, this reads as contact.
    strength = sin( ( strength - 0.5 ) * M_PI ) * 0.5 + 0.5;

    gl_FragColor = vec4( uColor, strength * uAlpha );
    if ( gl_FragColor.a < 0.001 ) discard;
  }
`

/**
 * Exported because the car needs a shadow that moves. Everything else in the
 * world is static and can use the component below, which places its quad from
 * props; the car has to write into the mesh every frame instead.
 */
export function createShadowMaterial(softness = 0.35): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(world.indirect) },
      uAlpha: { value: 0 },
      uSoftness: { value: softness },
    },
  })
}

type Props = {
  /** Ground position [x, z]. */
  position: [number, number]
  size?: [number, number]
  /** Multiplier on the shared reveal alpha, for objects that sit higher up. */
  intensity?: number
  softness?: number
  /**
   * Height of the object casting this. Drives how far the shadow slides and
   * how much it fades — high objects cast weak, distant shadows.
   */
  height?: number
  /**
   * Spins the quad within the ground plane, for shadows under geometry that is
   * itself yawed. The sun offset is always applied in world axes, so callers
   * must place these in world space rather than inside a rotated group.
   */
  yaw?: number
}

export default function GroundShadow({
  position,
  size = [3, 3],
  intensity = 1,
  softness = 0.35,
  height = 0.5,
  yaw = 0,
}: Props) {
  const [ox, oz] = shadowOffsetFor(height)
  // Contact fades with distance from the ground, the way a real one would.
  const falloff = Math.max(0, 1 - height / 4)
  const material = useMemo(() => createShadowMaterial(softness), [softness])

  // Driven from the shared reveal value, which GSAP tweens outside React —
  // so this has to happen per frame, not per render.
  useFrame(() => {
    material.uniforms.uAlpha.value = shadowAlpha.value * intensity * falloff
  })

  return (
    <mesh
      material={material}
      position={[position[0] + ox, 0.01, position[1] + oz]}
      rotation={[-Math.PI / 2, 0, yaw]}
      renderOrder={0}
    >
      <planeGeometry args={size} />
    </mesh>
  )
}
