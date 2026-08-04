import { Text } from '@react-three/drei'
import { useMemo } from 'react'
import { useObstacles, type Obstacle } from '../../lib/obstacles'
import { mulberry32, range } from '../../lib/rng'
import { INTRO_SPAWN, toWorld, WORLD_YAW } from '../../lib/world'
import { useClayMaterial } from './Clay'
import Prop from './Prop'

/**
 * Things that exist to be knocked over.
 *
 * The scenery is solid and the boulders roll, but neither is *asking* to be
 * hit — you find out they move by accident. Clutter is the other half: small,
 * light, obviously loose, arranged in stacks and rows that a car cannot resist
 * driving through. It is the cheapest possible answer to "why would anyone
 * drive around this site rather than click the nav", and folio's whole opening
 * is built on it.
 */

/* ------------------------------------------------------------------ */
/* Control keys                                                        */
/* ------------------------------------------------------------------ */

/**
 * WASD as four physical keycaps sitting in front of the spawn.
 *
 * Lifted straight from folio's `IntroSection`, where the arrow keys are objects
 * with mass rather than a legend. The trick is that it teaches the controls by
 * being the first thing you run into: you drive forward to read them, scatter
 * them, and in doing so learn both that W is forward and that the world
 * responds. A DOM hint can do the first half and never the second.
 *
 * They stay in the world after they are scattered. Resetting the car puts them
 * back, which is the only tidy-up anyone needs.
 */
const KEY_SIZE = 0.62
const KEY_HEIGHT = 0.26
const KEY_GAP = 0.74

/** Local offsets in the intro's yawed frame, laid out as the keys sit on a board. */
const KEY_LAYOUT: { label: string; x: number; z: number }[] = [
  { label: 'W', x: 0, z: 0 },
  { label: 'A', x: -KEY_GAP, z: KEY_GAP },
  { label: 'S', x: 0, z: KEY_GAP },
  { label: 'D', x: KEY_GAP, z: KEY_GAP },
]

/** In front of the car and a little to the side, so it is passed rather than sat on. */
const KEYS_ORIGIN: [number, number] = [-3.4, 3.2]

function ControlKeys() {
  const cap = useClayMaterial({ color: 'queenBlue' })

  const keys = useMemo(
    () =>
      KEY_LAYOUT.map((key) => {
        const [x, z] = toWorld(
          INTRO_SPAWN,
          KEYS_ORIGIN[0] + key.x,
          KEYS_ORIGIN[1] + key.z
        )
        const obstacle: Obstacle = {
          kind: 'box',
          position: [x, z],
          halfExtents: [KEY_SIZE / 2, KEY_HEIGHT / 2, KEY_SIZE / 2],
          y: KEY_HEIGHT / 2,
          yaw: WORLD_YAW,
          // Light enough that brushing one sends it skittering, heavy enough
          // that it does not launch into orbit off a boost.
          mass: 1.4,
        }
        return { ...key, obstacle }
      }),
    []
  )

  useObstacles(useMemo(() => keys.map((k) => k.obstacle), [keys]))

  return (
    <>
      {keys.map((key) => (
        <Prop
          key={key.label}
          obstacle={key.obstacle}
          shadow={[KEY_SIZE * 1.5, KEY_SIZE * 1.5]}
          shadowIntensity={0.6}
        >
          <mesh material={cap}>
            <boxGeometry args={[KEY_SIZE, KEY_HEIGHT, KEY_SIZE]} />
          </mesh>
          {/* The letter is parented to the cap, so it tumbles with it — a
              legend that stayed flat on the ground while the key rolled away
              would give the whole trick up. */}
          <Text
            font="/fonts/montserrat-700.ttf"
            position={[0, KEY_HEIGHT / 2 + 0.005, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.32}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {key.label}
          </Text>
        </Prop>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Scattered clutter                                                   */
/* ------------------------------------------------------------------ */

type ClutterProps = {
  center: [number, number]
  seed?: number
  count?: number
  radius?: number
  innerRadius?: number
}

/**
 * Crates and cones strewn around a point.
 *
 * Two shapes rather than one because they fail differently and that reads as
 * variety: a crate shunts and tumbles end over end, a cone tips and rolls in an
 * arc. Both are light. Nothing here is worth more than a second of anyone's
 * attention individually — the point is the field of them.
 */
export function Clutter({
  center,
  seed = 1,
  count = 12,
  radius = 18,
  innerRadius = 7,
}: ClutterProps) {
  const crateMaterial = useClayMaterial({ color: 'maizeCrayola' })
  const coneMaterial = useClayMaterial({ color: 'redSalsa' })

  const items = useMemo(() => {
    const rand = mulberry32(seed)
    return Array.from({ length: count }, () => {
      const angle = rand() * Math.PI * 2
      const dist = range(rand, innerRadius, radius)
      const scale = range(rand, 0.7, 1.15)
      const kind = rand() > 0.45 ? 'crate' : ('cone' as const)
      const x = center[0] + Math.cos(angle) * dist
      const z = center[1] + Math.sin(angle) * dist

      const size = 0.55 * scale
      const obstacle: Obstacle =
        kind === 'crate'
          ? {
              kind: 'box',
              position: [x, z],
              halfExtents: [size / 2, size / 2, size / 2],
              y: size / 2,
              yaw: rand() * Math.PI * 2,
              mass: 2.2 * scale,
            }
          : {
              kind: 'cylinder',
              position: [x, z],
              radius: size * 0.42,
              height: size * 1.5,
              y: size * 0.75,
              yaw: rand() * Math.PI * 2,
              mass: 1.8 * scale,
            }

      return { kind, scale, size, obstacle }
    })
  }, [center, seed, count, radius, innerRadius])

  useObstacles(useMemo(() => items.map((i) => i.obstacle), [items]))

  return (
    <>
      {items.map((item, i) => (
        <Prop
          key={i}
          obstacle={item.obstacle}
          shadow={[item.size * 2, item.size * 2]}
          shadowIntensity={0.7}
        >
          {item.kind === 'crate' ? (
            <mesh material={crateMaterial}>
              <boxGeometry args={[item.size, item.size, item.size]} />
            </mesh>
          ) : (
            /* Modelled about its centre to match the collider, which is why
               this is not sitting at half its height like a statically placed
               cone would be. */
            <mesh material={coneMaterial}>
              <coneGeometry args={[item.size * 0.5, item.size * 1.5, 12]} />
            </mesh>
          )}
        </Prop>
      ))}
    </>
  )
}

export default ControlKeys
