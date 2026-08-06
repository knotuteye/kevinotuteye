import { Center, Text, Text3D } from '@react-three/drei'
import { useCallback, useMemo, useState } from 'react'
import type * as THREE from 'three'
import { useObstacles, type Obstacle } from '../../../lib/obstacles'
import { toWorld, WORLD_YAW } from '../../../lib/world'
import { useClayMaterial } from '../Clay'
import GroundShadow from '../Shadow'

/**
 * The landing: the name as physical extruded geometry lying on the ground,
 * exactly as in the reference. It is not type set on a page — it is an object
 * in the world, with its own thickness and its own shadow.
 *
 * And now with its own body. Everything else out here is solid — the boards,
 * the plinths, the trees — so a name the car drove through was the one place
 * the world admitted it was a backdrop. Driving into "KEVIN" and stopping is
 * both the correct physics and the cheapest possible demonstration that this is
 * a place rather than a picture of one.
 *
 * The whole group is yawed to WORLD_YAW so the flat lettering squares up with
 * the camera instead of running diagonally across the frame.
 */

/** Where the lettering sits above the floor, just clear of z-fighting. */
const LETTER_Y = 0.04

/** Rows of the name, in the order they read, at their local z. */
const NAME_ROWS = [
  { text: 'KEVIN', z: -1.6, accent: false },
  { text: 'OTUTEYE', z: 1.8, accent: true },
] as const

const STRAPLINE = 'FULL STACK ENGINEER'
/** Local z of the strapline's plate, past the name on the camera's side. */
const STRAPLINE_Z = 5.2
const STRAPLINE_SIZE = 0.66
/**
 * The plate the strapline is painted on.
 *
 * Low enough to read as signage set into the ground rather than a wall, tall
 * enough that the chassis catches it — the line is part of the name block, and
 * a collider under flat paint with nothing standing there would be an invisible
 * kerb. Giving the paint something to sit on is what makes the stop legible.
 */
const PLATE = { height: 0.34, depth: 1.5, margin: 1.1 }

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

/**
 * One row of the name, as geometry and as something you can hit.
 *
 * The collider is measured rather than declared. `Text3D` lays the string out
 * from font metrics, so the only place the row's true extent exists is the
 * bounding box `Center` has just finished computing — and a hand-typed
 * half-extent is a number that goes stale the first time the copy or the font
 * changes. A shadow that is 40cm wrong is a soft edge nobody sees; a collider
 * that is 40cm wrong is either an invisible wall past the N or a car driving
 * through the K.
 *
 * One body per row rather than one per letter. The gaps between glyphs are a
 * few centimetres and the car is a metre wide, so there is nothing in there to
 * drive through — six bodies would buy contacts and no gameplay.
 */
function NameRow({
  text,
  material,
  z,
}: {
  text: string
  material: THREE.Material
  z: number
}) {
  const [bounds, setBounds] = useState<[number, number, number] | null>(null)

  // Stable identity: `Center` lists `onCentered` in its layout effect's deps,
  // so a fresh closure each render would re-measure on every render — and the
  // state write below would then never settle.
  const onCentered = useCallback(
    ({
      width,
      height,
      depth,
    }: {
      width: number
      height: number
      depth: number
    }) => {
      setBounds((previous) =>
        previous &&
        previous[0] === width &&
        previous[1] === height &&
        previous[2] === depth
          ? previous
          : [width, height, depth]
      )
    },
    []
  )

  const obstacles = useMemo<Obstacle[]>(() => {
    if (!bounds) return []
    const [width, height, depth] = bounds

    // `Center` centres the extrusion too, so half the thickness hangs below the
    // floor. The body covers only the part standing above it.
    const top = LETTER_Y + depth / 2

    return [
      {
        kind: 'box',
        position: toWorld([0, 0], 0, z),
        // The row lies flat: the glyphs' own height runs into world z, and
        // their extrusion is what stands up.
        halfExtents: [width / 2, top / 2, height / 2],
        y: top / 2,
        yaw: WORLD_YAW,
      },
    ]
  }, [bounds, z])
  useObstacles(obstacles)

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, LETTER_Y, z]}>
      <Center onCentered={onCentered}>
        <Text3D {...text3d} material={material}>
          {text}
        </Text3D>
      </Center>
    </group>
  )
}

export default function Intro() {
  const nameMaterial = useClayMaterial()
  const accent = useClayMaterial({ color: 'redSalsa' })
  const plateMaterial = useClayMaterial({ color: 'queenBlue' })

  const [plateWidth, setPlateWidth] = useState(0)

  /**
   * The plate is cut to the line it carries, which means waiting for troika to
   * lay the text out. `blockBounds` is [minX, minY, maxX, maxY] in local units
   * once the glyphs are placed; before that there is nothing to measure, and a
   * plate guessed from a character count would be visibly short of a word.
   */
  const onSync = useCallback((troika: unknown) => {
    const bounds = (troika as { textRenderInfo?: { blockBounds: number[] } })
      .textRenderInfo?.blockBounds
    if (!bounds) return
    setPlateWidth(bounds[2] - bounds[0] + PLATE.margin * 2)
  }, [])

  const obstacles = useMemo<Obstacle[]>(() => {
    if (plateWidth <= 0) return []
    return [
      {
        kind: 'box',
        position: toWorld([0, 0], 0, STRAPLINE_Z),
        halfExtents: [plateWidth / 2, PLATE.height / 2, PLATE.depth / 2],
        y: PLATE.height / 2,
        yaw: WORLD_YAW,
      },
    ]
  }, [plateWidth])
  useObstacles(obstacles)

  return (
    <group position={[0, 0, 0]} rotation={[0, WORLD_YAW, 0]}>
      {/* Letters lie flat and extrude upward, so the 3/4 camera catches
          their thickness the way it does in folio-2019. */}
      {NAME_ROWS.map((row) => (
        <NameRow
          key={row.text}
          text={row.text}
          material={row.accent ? accent : nameMaterial}
          z={row.z}
        />
      ))}

      {/* Signage, still painted flat the way the reference paints copy on the
          ground — but on a plate rather than on the floor, so the line has a
          body and reads as part of the name block rather than as a decal that
          happens to be near it. */}
      {plateWidth > 0 ? (
        <mesh
          material={plateMaterial}
          position={[0, PLATE.height / 2, STRAPLINE_Z]}
        >
          <boxGeometry args={[plateWidth, PLATE.height, PLATE.depth]} />
        </mesh>
      ) : null}

      <Text
        font="/fonts/montserrat-700.ttf"
        position={[0, PLATE.height + 0.02, STRAPLINE_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={STRAPLINE_SIZE}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.34}
        onSync={onSync}
      >
        {STRAPLINE}
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
      {/* The strapline's plate. Sized generously rather than to the measured
          text, because the measurement lives inside `Intro` and a shadow that
          is a metre wide of its object is a soft edge nobody reads. */}
      <GroundShadow
        position={place(STRAPLINE_Z)}
        size={[15.5, 3]}
        intensity={0.7}
        height={PLATE.height}
        yaw={WORLD_YAW}
      />
    </>
  )
}
