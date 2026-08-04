import { useMemo } from 'react'
import { useObstacles, type Obstacle } from '../../lib/obstacles'
import { mulberry32, range } from '../../lib/rng'
import { useClayMaterial } from './Clay'
import Prop from './Prop'
import GroundShadow from './Shadow'

/**
 * Boulders and lollipop trees scattered around a point.
 *
 * Deliberately built from primitives: chunky, matte, no texture detail. The
 * matcap does all the shading work, so a sphere and a cylinder are enough to
 * read as clay props. Placement is seeded so the world looks hand-arranged and
 * stays put between reloads.
 *
 * They are also solid. A tree you can drive through is scenery painted on a
 * backdrop; one you cannot is a thing in the same world as the car, and the
 * difference costs one cylinder each.
 *
 * The two kinds are solid in different ways, and the split is the point. A
 * boulder has mass and rolls off when you clip it, which is what makes the
 * plain feel like a place rather than a backdrop. A tree stays pinned, because
 * a tree that tips over and lies there reads as something broken rather than
 * something you did — the world should give where giving is the believable
 * outcome, and hold everywhere else.
 */

type Props = {
  center: [number, number]
  radius?: number
  count?: number
  seed?: number
  /** Keeps props from landing on top of the content in the middle. */
  innerRadius?: number
}

export default function Scatter({
  center,
  radius = 26,
  count = 14,
  seed = 1,
  innerRadius = 10,
}: Props) {
  /**
   * Three stones, three canopies, two barks.
   *
   * Declared flat rather than built in a loop because they are hooks, and a
   * fixed set is the whole point: eight materials cover the entire plain, and
   * an item picks one by index. The variants are tints of the same palette
   * entries — see `shade` — so the field gains range without gaining hues.
   */
  const stoneA = useClayMaterial()
  const stoneB = useClayMaterial({ tint: -0.16 })
  const stoneC = useClayMaterial({ color: 'maizeCrayola', tint: 0.34 })
  const leafA = useClayMaterial({ color: 'pistachio' })
  const leafB = useClayMaterial({ color: 'pistachio', tint: -0.2 })
  const leafC = useClayMaterial({ color: 'zomp' })
  const barkA = useClayMaterial({ color: 'queenBlue' })
  const barkB = useClayMaterial({ color: 'queenBlue', tint: -0.22 })

  const stones = useMemo(
    () => [stoneA, stoneB, stoneC],
    [stoneA, stoneB, stoneC]
  )
  const leaves = useMemo(() => [leafA, leafB, leafC], [leafA, leafB, leafC])
  const barks = useMemo(() => [barkA, barkB], [barkA, barkB])

  const items = useMemo(() => {
    const rand = mulberry32(seed)
    const out: {
      kind: 'rock' | 'tree'
      x: number
      z: number
      scale: number
      rotation: number
      /** Which material variant, and for trees which silhouette. */
      variant: number
      shape: number
    }[] = []

    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2
      const dist = range(rand, innerRadius, radius)
      out.push({
        kind: rand() > 0.55 ? 'tree' : 'rock',
        x: center[0] + Math.cos(angle) * dist,
        z: center[1] + Math.sin(angle) * dist,
        scale: range(rand, 0.6, 1.5),
        rotation: rand() * Math.PI * 2,
        variant: Math.floor(rand() * 3),
        shape: Math.floor(rand() * 3),
      })
    }
    return out
  }, [center, radius, count, seed, innerRadius])

  /**
   * Colliders, sized a little under the meshes rather than around them.
   *
   * A trunk is 0.32m across and its foliage is 1.4m; matching either exactly is
   * wrong. Match the trunk and the car parks inside the canopy, match the
   * canopy and it stops in mid-air. The compromise is a post a touch wider than
   * the trunk, which reads as hitting the tree from every angle the camera
   * offers.
   *
   * The boulder's sphere is a shade under its silhouette for the same reason,
   * and its mass scales with size: a small one skips away from a glancing hit
   * and a large one takes a proper shove, which is most of what sells them as
   * having weight at all.
   */
  const obstacles = useMemo<Obstacle[]>(
    () =>
      items.map((item) =>
        item.kind === 'tree'
          ? {
              kind: 'cylinder',
              position: [item.x, item.z],
              radius: 0.24 * item.scale,
              height: 2.4 * item.scale,
              y: 1.2 * item.scale,
            }
          : {
              kind: 'sphere',
              position: [item.x, item.z],
              radius: 0.55 * item.scale,
              y: 0.55 * item.scale,
              mass: 3 + item.scale * 6,
            }
      ),
    [items]
  )
  useObstacles(obstacles)

  return (
    <group>
      {items.map((item, i) =>
        item.kind === 'rock' ? (
          /* Mesh about the body's centre, and squashed just enough that its
             silhouette matches the collider it now rides on — a boulder that
             visibly hovers a few centimetres over its own shadow is worse than
             one that never moved. */
          <Prop
            key={i}
            obstacle={obstacles[i]}
            shadow={[item.scale * 1.9, item.scale * 1.9]}
            shadowIntensity={0.9}
          >
            <mesh
              material={stones[item.variant]}
              scale={[item.scale, item.scale * 0.88, item.scale]}
              rotation={[0, item.rotation, 0]}
            >
              {/* Facet count varies with the variant too — a smoother stone
                  next to a chunky one does more for the field than either
                  colour change does. */}
              <dodecahedronGeometry args={[0.6, item.shape === 2 ? 1 : 0]} />
            </mesh>
          </Prop>
        ) : (
          <group key={i} position={[item.x, 0, item.z]}>
            <mesh
              material={barks[item.variant % barks.length]}
              position={[0, item.scale * 0.7, 0]}
              scale={[item.scale, item.scale, item.scale]}
            >
              <cylinderGeometry args={[0.11, 0.16, 1.4, 7]} />
            </mesh>

            {/* Three silhouettes off one trunk. The blob is the original, the
                spire reads as a conifer at distance, and the stack breaks up a
                skyline of identical lollipops — which is what a plain of one
                tree shape looked like from the camera's fixed angle. */}
            {item.shape === 1 ? (
              <mesh
                material={leaves[item.variant]}
                position={[0, item.scale * 1.95, 0]}
                rotation={[0, item.rotation, 0]}
                scale={[item.scale, item.scale, item.scale]}
              >
                <coneGeometry args={[0.66, 1.9, 6]} />
              </mesh>
            ) : item.shape === 2 ? (
              <>
                <mesh
                  material={leaves[item.variant]}
                  position={[0, item.scale * 1.6, 0]}
                  rotation={[0, item.rotation, 0]}
                  scale={[item.scale, item.scale, item.scale]}
                >
                  <icosahedronGeometry args={[0.66, 0]} />
                </mesh>
                <mesh
                  material={leaves[item.variant]}
                  position={[0, item.scale * 2.28, 0]}
                  rotation={[0, item.rotation * 1.7, 0]}
                  scale={[item.scale * 0.72, item.scale * 0.72, item.scale * 0.72]}
                >
                  <icosahedronGeometry args={[0.66, 0]} />
                </mesh>
              </>
            ) : (
              <mesh
                material={leaves[item.variant]}
                position={[0, item.scale * 1.75, 0]}
                rotation={[0, item.rotation, 0]}
                scale={[item.scale, item.scale, item.scale]}
              >
                <icosahedronGeometry args={[0.72, 0]} />
              </mesh>
            )}

            <GroundShadow
              position={[item.x, item.z]}
              size={[item.scale * 2.4, item.scale * 2.4]}
              intensity={0.8}
              height={item.scale * 1.1}
            />
          </group>
        )
      )}
    </group>
  )
}
