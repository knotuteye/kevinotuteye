import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getCarState } from '../../lib/car'
import { SIGN_LABEL_OFFSET, SIGNPOSTS } from '../../lib/keepout'
import { INTRO_SPAWN, WORLD_YAW } from '../../lib/world'
import { shadowAlpha } from './Shadow'

/**
 * Painted arrows on the floor around the intro, one per zone, each pointing at
 * where that zone actually is.
 *
 * This is the piece that makes the world navigable. The sections sit 55m to
 * 100m out — far enough that no camera framing the name can also show them —
 * so without something at the start saying "there is a WORK over there, and it
 * is that way", a driver has an open plain and no reason to pick a direction.
 * The zone markers are the destination; these are the road sign.
 *
 * They fade out once you are clear of the intro, because by then they point at
 * things you can see for yourself.
 */

const FADE_START = 20
const FADE_END = 34

type TextLike = THREE.Object3D & { fillOpacity: number }

/** A flat chevron, authored in XY and laid down onto the ground plane. Its
 *  point ends up along local -z, which is what the headings below assume. */
function useArrowGeometry() {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(0, 1.5)
    shape.lineTo(-1.05, 0.1)
    shape.lineTo(-0.4, 0.1)
    shape.lineTo(-0.4, -1.5)
    shape.lineTo(0.4, -1.5)
    shape.lineTo(0.4, 0.1)
    shape.lineTo(1.05, 0.1)
    shape.closePath()

    const geo = new THREE.ShapeGeometry(shape)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [])

  return geometry
}

export default function Signposts() {
  const geometry = useArrowGeometry()
  const labelRefs = useRef<(TextLike | null)[]>([])

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    []
  )

  // Placement lives in `lib/keepout`, alongside the lettering it has to clear
  // and the scenery that in turn has to clear these — three things arguing over
  // the same patch of ground in front of the name, settled in one place.
  const signs = SIGNPOSTS

  useFrame(() => {
    const car = getCarState()
    const [ix, iz] = INTRO_SPAWN
    const distance = car.ready ? Math.hypot(car.x - ix, car.z - iz) : 0

    const proximity =
      1 -
      THREE.MathUtils.clamp(
        (distance - FADE_START) / (FADE_END - FADE_START),
        0,
        1
      )

    // Rides the shared reveal, so the signs grow in with everything else rather
    // than being present before the world they describe.
    const opacity = shadowAlpha.value * proximity

    material.opacity = opacity * 0.85
    for (const label of labelRefs.current) {
      if (label) label.fillOpacity = opacity
    }
  })

  return (
    <group>
      {signs.map((sign, i) => (
        <group key={sign.id} position={[sign.x, 0, sign.z]}>
          <mesh
            geometry={geometry}
            material={material}
            rotation={[0, sign.heading, 0]}
            position={[0, 0.05, 0]}
            renderOrder={1}
          />

          {/* The label stays squared up with the camera rather than turning
              with the arrow — ground type that yaws per sign would be upside
              down for half of them. */}
          <group rotation={[0, WORLD_YAW, 0]}>
            <Text
              ref={(node) => {
                labelRefs.current[i] = node as TextLike | null
              }}
              font="/fonts/montserrat-700.ttf"
              position={[0, 0.06, SIGN_LABEL_OFFSET]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.72}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              letterSpacing={0.14}
              fillOpacity={0}
              material-toneMapped={false}
              material-depthWrite={false}
              material-side={THREE.DoubleSide}
            >
              {sign.label}
            </Text>
          </group>
        </group>
      ))}
    </group>
  )
}
