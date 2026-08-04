import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { projects, wrap } from '../../../lib/content'
import { toWorld, WORLD_YAW, ZONES } from '../../../lib/world'
import { useClayMaterial } from '../Clay'
import GroundText from '../GroundText'
import GroundShadow from '../Shadow'
import { useNearest } from '../useNearest'

/**
 * Projects, as a row of standing boards you drive along.
 *
 * Boards stand upright rather than lying flat — they are the one thing in the
 * world with a "face", which is what makes them read as work to be looked at
 * rather than terrain to be crossed. Pulling up in front of one opens it.
 */

const SPACING = 8.5
/** Clears the zone marker's footprint. */
const CONTENT_START = 6
const BOARD = { width: 4.2, height: 2.6, depth: 0.32 }

function Board({
  index,
  active,
}: {
  index: number
  active: boolean
}) {
  const material = useClayMaterial()
  const accent = useClayMaterial({ index })
  const ref = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!ref.current) return
    const lift = active ? 0.55 : 0
    ref.current.position.y += (lift - ref.current.position.y) * 0.14
  })

  return (
    <group ref={ref}>
      {/* Leaning back slightly, so the face catches the camera. */}
      <mesh
        material={material}
        position={[0, BOARD.height / 2 + 0.35, 0]}
        rotation={[0.16, 0, 0]}
      >
        <boxGeometry args={[BOARD.width, BOARD.height, BOARD.depth]} />
      </mesh>
      {/* Colored cap — keeps the palette cycling legible without turning the
          whole face into a low-value block. */}
      <mesh
        material={accent}
        position={[0, BOARD.height + 0.47, -0.09]}
        rotation={[0.16, 0, 0]}
      >
        <boxGeometry args={[BOARD.width, 0.26, BOARD.depth * 1.15]} />
      </mesh>
      <mesh material={accent} position={[0, 0.18, 0]}>
        <boxGeometry args={[BOARD.width * 0.24, 0.36, 0.8]} />
      </mesh>
    </group>
  )
}

export default function Projects() {
  const [zx, zz] = ZONES.projects.position

  // Measured a little in front of each board rather than at it, so the board
  // opens as you pull up facing it instead of when you clip its base.
  const stands = useMemo(
    () =>
      projects.map((_, i) =>
        toWorld(
          [zx, zz],
          (i - (projects.length - 1) / 2) * SPACING,
          -CONTENT_START + 3.5
        )
      ),
    [zx, zz]
  )
  // Overlapping radii; `useNearest` resolves to the closest board, so driving
  // along the row hands off from one to the next without a dead gap between.
  const activeIndex = useNearest(stands, SPACING * 0.8)

  return (
    <group position={[zx, 0, zz]} rotation={[0, WORLD_YAW, 0]}>
      {projects.map((project, i) => {
        const x = (i - (projects.length - 1) / 2) * SPACING
        const isActive = activeIndex === i

        return (
          <group key={project.name} position={[x, 0, -CONTENT_START]}>
            <Board index={i + 2} active={isActive} />

            <GroundShadow
              position={toWorld([zx, zz], x, -CONTENT_START)}
              size={[BOARD.width * 1.5, BOARD.width * 1.1]}
              height={BOARD.height * 0.6}
              intensity={0.85}
              yaw={WORLD_YAW}
            />

            <GroundText
              position={[0, 3.1]}
              size={0.5}
              anchorX="center"
              maxWidth={8}
            >
              {wrap(project.name.split(',')[0], 26, 2)}
            </GroundText>

            {isActive ? (
              <>
                <GroundText
                  position={[0, 5.0]}
                  size={0.3}
                  anchorX="center"
                  opacity={0.85}
                  maxWidth={8.5}
                >
                  {wrap(project.about, 42, 4)}
                </GroundText>
                <GroundText
                  position={[0, 7.4]}
                  size={0.26}
                  anchorX="center"
                  opacity={0.6}
                  maxWidth={8.5}
                >
                  {project.technologies.slice(0, 6).join('  ·  ')}
                </GroundText>
              </>
            ) : null}
          </group>
        )
      })}
    </group>
  )
}
