import { useMemo } from 'react'
import { mulberry32, range } from '../../lib/rng'
import { useClayMaterial } from './Clay'
import GroundShadow from './Shadow'

/**
 * Boulders and lollipop trees scattered around a point.
 *
 * Deliberately built from primitives: chunky, matte, no texture detail. The
 * matcap does all the shading work, so a sphere and a cylinder are enough to
 * read as clay props. Placement is seeded so the world looks hand-arranged and
 * stays put between reloads.
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
  const bone = useClayMaterial()
  const foliage = useClayMaterial({ color: 'pistachio' })
  const trunk = useClayMaterial({ color: 'queenBlue' })

  const items = useMemo(() => {
    const rand = mulberry32(seed)
    const out: {
      kind: 'rock' | 'tree'
      x: number
      z: number
      scale: number
      rotation: number
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
      })
    }
    return out
  }, [center, radius, count, seed, innerRadius])

  return (
    <group>
      {items.map((item, i) =>
        item.kind === 'rock' ? (
          <group key={i} position={[item.x, 0, item.z]}>
            <mesh
              material={bone}
              scale={[item.scale, item.scale * 0.7, item.scale]}
              position={[0, item.scale * 0.32, 0]}
              rotation={[0, item.rotation, 0]}
            >
              <dodecahedronGeometry args={[0.6, 0]} />
            </mesh>
            <GroundShadow
              position={[item.x, item.z]}
              size={[item.scale * 1.9, item.scale * 1.9]}
              intensity={0.9}
              height={item.scale * 0.32}
            />
          </group>
        ) : (
          <group key={i} position={[item.x, 0, item.z]}>
            <mesh
              material={trunk}
              position={[0, item.scale * 0.7, 0]}
              scale={[item.scale, item.scale, item.scale]}
            >
              <cylinderGeometry args={[0.11, 0.16, 1.4, 7]} />
            </mesh>
            <mesh
              material={foliage}
              position={[0, item.scale * 1.75, 0]}
              rotation={[0, item.rotation, 0]}
              scale={[item.scale, item.scale, item.scale]}
            >
              <icosahedronGeometry args={[0.72, 0]} />
            </mesh>
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
