import { Center, Text, Text3D } from '@react-three/drei'
import { toWorld, WORLD_YAW } from '../../../lib/world'
import { useClayMaterial } from '../Clay'
import GroundShadow from '../Shadow'

/**
 * The landing: the name as physical extruded geometry lying on the ground,
 * exactly as in the reference. It is not type set on a page — it is an object
 * in the world, with its own thickness and its own shadow.
 *
 * The whole group is yawed to WORLD_YAW so the flat lettering squares up with
 * the camera instead of running diagonally across the frame.
 */
export default function Intro() {
  const nameMaterial = useClayMaterial()
  const accent = useClayMaterial({ color: 'redSalsa' })

  const text3d = {
    font: '/fonts/montserrat-700.typeface.json',
    size: 2.4,
    height: 0.55,
    curveSegments: 5,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.035,
    bevelSegments: 2,
    letterSpacing: -0.06,
  } as const

  return (
    <group position={[0, 0, 0]} rotation={[0, WORLD_YAW, 0]}>
      {/* Letters lie flat and extrude upward, so the 3/4 camera catches
          their thickness the way it does in folio-2019. */}
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, -1.6]}>
        <Center>
          <Text3D {...text3d} material={nameMaterial}>
            KEVIN
          </Text3D>
        </Center>
      </group>

      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 1.8]}>
        <Center>
          <Text3D {...text3d} material={accent}>
            OTUTEYE
          </Text3D>
        </Center>
      </group>

      {/* Flat signage decal, the way the reference paints copy on the ground. */}
      <Text
        font="/fonts/montserrat-700.ttf"
        position={[0, 0.06, 5.2]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.66}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.34}
      >
        FULL STACK · MUSIC
      </Text>
    </group>
  )
}

/** Shadows for the name, in world space so the sun offset stays true. */
export function IntroShadows() {
  const place = (z: number) => toWorld([0, 0], 0, z)

  return (
    <>
      <GroundShadow
        position={place(-1.6)}
        size={[12, 3.2]}
        intensity={0.42}
        height={0.55}
        yaw={WORLD_YAW}
      />
      <GroundShadow
        position={place(1.8)}
        size={[15, 3.2]}
        intensity={0.42}
        height={0.55}
        yaw={WORLD_YAW}
      />
    </>
  )
}
