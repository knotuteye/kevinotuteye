import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
  focusZone,
  getWorldState,
  setHovered,
  type Zone as ZoneData,
} from '../../lib/world'

/**
 * An interactive place on the ground: an outlined rectangle, a hazard-striped
 * fence that springs up on hover, and a floating label.
 *
 * Shaders adapted from folio-2019's areaFence / areaFloorBorder (MIT). Every
 * affordance uses `back` easing — toys snap into place, which is the whole
 * reason this reads as a plaything rather than a UI.
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

type Props = {
  zone: ZoneData
  onActivate?: (zone: ZoneData) => void
}

export default function Zone({ zone, onActivate }: Props) {
  const [x, z] = zone.position
  const [hx, hz] = zone.halfExtents

  const fenceRef = useRef<THREE.Mesh>(null)
  const labelRef = useRef<THREE.Group>(null)
  const isHovered = useRef(false)

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

  useEffect(
    () => () => {
      fenceMaterial.dispose()
      borderMaterial.dispose()
    },
    [fenceMaterial, borderMaterial]
  )

  const fade = useRef(1)

  useFrame((_, delta) => {
    fenceMaterial.uniforms.uTime.value += delta * 1000

    // A zone marker is a signpost seen from a distance. Once you are actually
    // inside it, it stops being useful and starts covering the content, so it
    // retracts.
    const { focus } = getWorldState()
    const inside =
      focus?.id === zone.id || focus?.id.startsWith(`${zone.id}-`) === true
    fade.current += ((inside ? 0 : 1) - fade.current) * Math.min(1, delta * 4)

    borderMaterial.uniforms.uAlpha.value = 0.65 * fade.current
    fenceMaterial.uniforms.uBorderAlpha.value = 0.5 * fade.current

    if (labelRef.current) {
      labelRef.current.scale.setScalar(Math.max(0.0001, fade.current))
    }
  })

  const enter = () => {
    if (isHovered.current) return
    isHovered.current = true
    setHovered(zone.id)
    document.body.style.cursor = 'pointer'
    if (fenceRef.current) {
      gsap.to(fenceRef.current.position, {
        y: FENCE_HEIGHT / 2,
        duration: 0.35,
        ease: 'back.out(3)',
        overwrite: true,
      })
    }
    if (labelRef.current) {
      gsap.to(labelRef.current.position, {
        y: 2.5,
        duration: 0.35,
        delay: 0.1,
        ease: 'back.out(3)',
        overwrite: true,
      })
    }
  }

  const leave = () => {
    if (!isHovered.current) return
    isHovered.current = false
    setHovered(null)
    document.body.style.cursor = ''
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
        y: 1.2,
        duration: 0.35,
        ease: 'back.in(4)',
        overwrite: true,
      })
    }
  }

  const activate = () => {
    focusZone(zone)
    onActivate?.(zone)

    // Squash, then spring back, with a white flash decaying behind it.
    if (fenceRef.current) {
      gsap.to(fenceRef.current.position, {
        y: 0.05,
        duration: 0.05,
        overwrite: true,
        onComplete: () => {
          if (!fenceRef.current) return
          gsap.to(fenceRef.current.position, {
            y: FENCE_HEIGHT / 2,
            duration: 0.25,
            ease: 'back.out(2)',
          })
        },
      })
    }
    gsap.fromTo(
      fenceMaterial.uniforms.uStrikeAlpha,
      { value: 1 },
      { value: 0.25, duration: 1.5 }
    )
  }

  // Releasing the cursor if this unmounts mid-hover.
  useEffect(() => () => void (document.body.style.cursor = ''), [])

  return (
    <group position={[x, 0, z]}>
      {/* Ground outline */}
      <mesh
        material={borderMaterial}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        renderOrder={1}
      >
        <planeGeometry args={[hx * 2, hz * 2]} />
      </mesh>

      {/* Fence, parked below ground until hovered */}
      <mesh
        ref={fenceRef}
        material={fenceMaterial}
        position={[0, -FENCE_HEIGHT / 2, 0]}
        renderOrder={2}
      >
        <boxGeometry args={[hx * 2, FENCE_HEIGHT, hz * 2]} />
      </mesh>

      <group ref={labelRef} position={[0, 1.2, 0]}>
        <Text
          font="/fonts/montserrat-700.ttf"
          fontSize={0.62}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.08}
        >
          {zone.label}
        </Text>
      </group>

      {/* Interaction footprint — invisible, generously sized for touch. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}
        visible={false}
        onPointerOver={enter}
        onPointerOut={leave}
        onClick={activate}
      >
        <planeGeometry args={[hx * 2.2, hz * 2.2]} />
      </mesh>
    </group>
  )
}
