import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getCarState } from '../../lib/car'
import { INTRO_SPAWN, WORLD_YAW, ZONE_LIST } from '../../lib/world'
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

/** Ring radius around the spawn point, close enough that all three signs fit
 *  the opening frame. Individual signs push out past this if they have to. */
const RADIUS = 11

/**
 * Keep-out box around the name, in world ground coordinates.
 *
 * About lies almost due -z of the spawn, which is straight through the middle
 * of "KEVIN OTUTEYE" — at a fixed ring radius its arrow lands on the lettering
 * and both become unreadable. Rather than move every sign out to clear the one
 * bad case, a sign that lands in here walks outward along its own bearing until
 * it does not.
 */
const NAME_CLEARANCE = { x: 11, z: 7 }
const MAX_RADIUS = 26

function placeSign(
  from: [number, number],
  bearing: [number, number]
): [number, number] {
  for (let radius = RADIUS; radius <= MAX_RADIUS; radius += 1) {
    const x = from[0] + bearing[0] * radius
    const z = from[1] + bearing[1] * radius
    if (Math.abs(x) > NAME_CLEARANCE.x || Math.abs(z) > NAME_CLEARANCE.z) {
      return [x, z]
    }
  }
  return [
    from[0] + bearing[0] * MAX_RADIUS,
    from[1] + bearing[1] * MAX_RADIUS,
  ]
}
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

  const signs = useMemo(() => {
    const [ix, iz] = INTRO_SPAWN

    return ZONE_LIST.filter((zone) => zone.id !== 'intro').map((zone) => {
      const dx = zone.position[0] - ix
      const dz = zone.position[1] - iz
      const length = Math.hypot(dx, dz)

      // Each sign sits out along its own zone's bearing from where the car
      // lands — so the sign for a zone is already on the way to it.
      const [x, z] = placeSign([ix, iz], [dx / length, dz / length])

      // A group yaw θ sends local -z to (-sinθ, -cosθ); we want that to be
      // (dx, dz), hence the half turn.
      const heading = Math.atan2(dx, dz) + Math.PI

      return { id: zone.id, label: zone.label, x, z, heading }
    })
  }, [])

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
              position={[0, 0.06, 2.5]}
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
