import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getCarState } from '../../lib/car'
import {
  getWorldState,
  isInsideZone,
  setActiveZone,
  toLocal,
  WORLD_YAW,
  type Zone as ZoneData,
} from '../../lib/world'

/**
 * A place on the ground you drive into: an outlined rectangle, a hazard-striped
 * fence that springs up when the car is inside it, and a floating label.
 *
 * Shaders adapted from folio-2019's areaFence / areaFloorBorder (MIT). Every
 * affordance uses `back` easing — toys snap into place, which is the whole
 * reason this reads as a plaything rather than a UI.
 *
 * The label never hides. Under the old click-to-focus model it appeared on
 * hover, which meant that from the landing view — where no marker was even on
 * screen — there was no way to learn the site had other pages. A sign you have
 * to already be looking at is not a sign.
 */

const FENCE_HEIGHT = 1.6

const fenceVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vModelPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    vModelPosition = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`

const fenceFragment = /* glsl */ `
  uniform float uTime;
  uniform float uBorderAlpha;
  uniform float uStrikeAlpha;
  uniform float uStrikeWidth;
  uniform float uBorderWidth;

  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vModelPosition;

  void main() {
    // Clip the part of the fence still below the ground as it rises. The
    // epsilon matters: at rest the box's top face sits exactly on y=0, and a
    // strict < 0.0 test leaves it visible as a striped slab on the ground.
    if ( vModelPosition.y < 0.001 ) discard;

    float strikeStrength = mod(
      ( vPosition.x + vPosition.z - uTime * 0.00035 + vPosition.y ) / uStrikeWidth * 0.5,
      1.0
    );
    strikeStrength = step( strikeStrength, 0.5 ) * uStrikeAlpha;

    float borderStrength = max(
      step( 1.0 - vUv.y, uBorderWidth ),
      step( vUv.y, uBorderWidth )
    ) * uBorderAlpha;

    gl_FragColor = vec4( vec3( 1.0 ), max( strikeStrength, borderStrength ) );
  }
`

const borderFragment = /* glsl */ `
  uniform float uAlpha;
  uniform float uWidth;
  varying vec2 vUv;

  void main() {
    float edge = min( min( vUv.x, 1.0 - vUv.x ), min( vUv.y, 1.0 - vUv.y ) );

    // Screen-space derivative so the line antialiases instead of moiréing into
    // a grid when the zone is far away and nearly edge-on to the camera.
    float w = fwidth( edge ) * 1.5;
    float border = 1.0 - smoothstep( uWidth - w, uWidth + w, edge );
    if ( border < 0.01 ) discard;

    gl_FragColor = vec4( vec3( 1.0 ), uAlpha * border );
  }
`

const borderVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`

/**
 * Four walls and no lid, matching folio's AreaFenceGeometry.
 *
 * A `boxGeometry` would be one line, and was — but it caps the top, and now
 * that the camera follows the car *into* the zone you end up looking down
 * through a striped ceiling at the content you came to read. UVs run 0..1 up
 * each wall so the shader's border strips land on the wall's own top and bottom
 * edges rather than being stretched across a cube's face layout.
 */
function createFenceGeometry(
  width: number,
  depth: number,
  height: number
): THREE.BufferGeometry {
  const hw = width / 2
  const hd = depth / 2
  const hh = height / 2

  // Each wall as two triangles, wound so DoubleSide shows the stripes inside
  // and out.
  const walls: [number, number, number, number][] = [
    [-hw, -hd, hw, -hd],
    [hw, -hd, hw, hd],
    [hw, hd, -hw, hd],
    [-hw, hd, -hw, -hd],
  ]

  const positions: number[] = []
  const uvs: number[] = []

  for (const [x1, z1, x2, z2] of walls) {
    positions.push(
      x1, -hh, z1, x2, -hh, z2, x2, hh, z2,
      x1, -hh, z1, x2, hh, z2, x1, hh, z1
    )
    uvs.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  )
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  return geometry
}

type Props = {
  zone: ZoneData
  /** Fired once, on the frame the car crosses in. */
  onEnter?: (zone: ZoneData) => void
  /** Fired once, on the frame it crosses back out. */
  onLeave?: (zone: ZoneData) => void
}

export default function Zone({ zone, onEnter, onLeave }: Props) {
  const [x, z] = zone.position
  const [hx, hz] = zone.halfExtents

  const fenceRef = useRef<THREE.Mesh>(null)
  const labelRef = useRef<THREE.Group>(null)
  /** At the gate — drives the fence and label. */
  const atMarker = useRef(false)
  /** Anywhere in the section — drives the URL and the camera angle. */
  const inRegion = useRef(false)

  const fenceMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fenceVertex,
        fragmentShader: fenceFragment,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uBorderAlpha: { value: 0.5 },
          uStrikeAlpha: { value: 0.25 },
          uStrikeWidth: { value: 0.5 },
          uBorderWidth: { value: 0.08 },
        },
      }),
    []
  )

  const borderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: borderVertex,
        fragmentShader: borderFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uAlpha: { value: 0.65 },
          uWidth: { value: 0.012 },
        },
      }),
    []
  )

  const fenceGeometry = useMemo(
    () => createFenceGeometry(hx * 2, hz * 2, FENCE_HEIGHT),
    [hx, hz]
  )

  useEffect(
    () => () => {
      fenceMaterial.dispose()
      borderMaterial.dispose()
      fenceGeometry.dispose()
    },
    [fenceMaterial, borderMaterial, fenceGeometry]
  )

  const enter = () => {
    if (fenceRef.current) {
      gsap.to(fenceRef.current.position, {
        y: FENCE_HEIGHT / 2,
        duration: 0.35,
        ease: 'back.out(3)',
        overwrite: true,
      })
    }
    // The label lifts out of the car's way rather than hiding, so you can still
    // see which zone you are standing in.
    if (labelRef.current) {
      gsap.to(labelRef.current.position, {
        y: 3.2,
        duration: 0.35,
        delay: 0.1,
        ease: 'back.out(3)',
        overwrite: true,
      })
    }
    gsap.fromTo(
      fenceMaterial.uniforms.uStrikeAlpha,
      { value: 1 },
      { value: 0.25, duration: 1.5 }
    )
  }

  const leave = () => {
    if (fenceRef.current) {
      gsap.to(fenceRef.current.position, {
        y: -FENCE_HEIGHT / 2,
        duration: 0.35,
        ease: 'back.in(4)',
        overwrite: true,
      })
    }
    if (labelRef.current) {
      gsap.to(labelRef.current.position, {
        y: 1.6,
        duration: 0.35,
        ease: 'back.in(4)',
        overwrite: true,
      })
    }
  }

  useFrame((_, delta) => {
    fenceMaterial.uniforms.uTime.value += delta * 1000

    const car = getCarState()
    if (!car.ready) return

    // In the marker's own frame, which is the section's — see the yaw on the
    // group below. Tested in world axes this was a rectangle at 38° to the one
    // being drawn, so the fence sprang up before the car reached the outline
    // on one side and after it had crossed on the other.
    const [localX, localZ] = toLocal(zone.position, car.x, car.z)
    const nowAtMarker = Math.abs(localX) < hx && Math.abs(localZ) < hz
    if (nowAtMarker !== atMarker.current) {
      atMarker.current = nowAtMarker
      if (nowAtMarker) enter()
      else leave()
    }

    const nowInRegion = isInsideZone(zone, car.x, car.z)
    if (nowInRegion !== inRegion.current) {
      inRegion.current = nowInRegion
      if (nowInRegion) {
        setActiveZone(zone.id)
        onEnter?.(zone)
      } else {
        onLeave?.(zone)
        // Only surrender the active zone if it is still ours. Regions do not
        // overlap, but two Zone components settle in an unspecified order
        // within a frame, so an unconditional clear could wipe a fresh arrival.
        if (getWorldState().activeZone === zone.id) setActiveZone(null)
      }
    }
  })

  return (
    /**
     * Yawed to WORLD_YAW, like every section's content and every ground decal
     * in the world.
     *
     * Without it the marker was the one rectangle on the plain drawn on world
     * axes, so it sat at 38° to the columns of copy it introduces — its
     * corners cut into the first rows of text, and its label faced away from
     * the fixed camera. Squared up, its footprint is exactly the `halfExtents`
     * the sections space their content against.
     */
    <group position={[x, 0, z]} rotation={[0, WORLD_YAW, 0]}>
      {/* Ground outline */}
      <mesh
        material={borderMaterial}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        renderOrder={1}
      >
        <planeGeometry args={[hx * 2, hz * 2]} />
      </mesh>

      {/* Fence, parked below ground until the car arrives */}
      <mesh
        ref={fenceRef}
        geometry={fenceGeometry}
        material={fenceMaterial}
        position={[0, -FENCE_HEIGHT / 2, 0]}
        renderOrder={2}
      />

      <group ref={labelRef} position={[0, 1.6, 0]}>
        <Text
          font="/fonts/montserrat-700.ttf"
          fontSize={0.95}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.08}
        >
          {zone.label}
        </Text>
      </group>
    </group>
  )
}
