import { Text, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { projects, wrap, type Project } from '../../../lib/content'
import { useObstacles, type Obstacle } from '../../../lib/obstacles'
import { toWorld, WORLD_YAW, ZONES } from '../../../lib/world'
import { useClayMaterial } from '../Clay'
import GroundText from '../GroundText'
import { createImageMaterial } from '../materials/clay'
import GroundShadow from '../Shadow'
import { useNearest } from '../useNearest'

/**
 * Projects, as a row of standing boards you drive along.
 *
 * Boards stand upright rather than lying flat — they are the one thing in the
 * world with a "face", which is what makes them read as work to be looked at
 * rather than terrain to be crossed. Pulling up in front of one opens it.
 *
 * And the face now carries the work. A portfolio whose project boards are blank
 * slabs is asking to be taken on trust; folio puts a screenshot on every one,
 * and that is most of why its projects section reads as finished. Drop a file
 * in `public/img/projects/` and point a project's `image` at it. Until then a
 * board shows a typographic plate built from its own initials — plainly a
 * placeholder rather than a borrowed screenshot.
 */

const SPACING = 8.5
/** Clears the zone marker's footprint. */
const CONTENT_START = 6
const BOARD = { width: 4.2, height: 2.6, depth: 0.32 }

/** Inset from the slab's edge, so the board reads as a frame around the face. */
const FACE = { width: BOARD.width - 0.34, height: BOARD.height - 0.34 }

/** Just proud of the slab's front, inside the leaned group. */
const FACE_Z = BOARD.depth / 2 + 0.012

/** First letters of the first two significant words — "Godseye Video" -> "GV". */
function initials(name: string): string {
  return name
    .split(',')[0]
    .split(/\s+/)
    .filter((word) => /^[a-z]/i.test(word) && word.length > 1)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}

/**
 * A screenshot, cover-fitted to the board's face.
 *
 * Its own component because `useTexture` suspends, and a board with no image
 * must not pay for a hook it has nothing to give. Cover rather than contain:
 * letterboxing a screenshot inside a slab that is itself a frame gives you two
 * nested borders and a picture the size of a stamp.
 */
function BoardImage({ src }: { src: string }) {
  const texture = useTexture(src)

  const material = useMemo(() => {
    const image = texture.image as { width: number; height: number } | undefined
    const source = image && image.height ? image.width / image.height : 1
    const target = FACE.width / FACE.height

    // Crop the long axis by moving the UV window rather than by scaling the
    // mesh, so every board in the row stays exactly the same size.
    const cloned = texture.clone()
    cloned.colorSpace = THREE.SRGBColorSpace
    cloned.center.set(0.5, 0.5)
    if (source > target) cloned.repeat.set(target / source, 1)
    else cloned.repeat.set(1, source / target)
    cloned.needsUpdate = true

    return createImageMaterial(cloned)
  }, [texture])

  useEffect(
    () => () => {
      material.map?.dispose()
      material.dispose()
    },
    [material]
  )

  return (
    <mesh material={material} position={[0, 0, FACE_Z]}>
      <planeGeometry args={[FACE.width, FACE.height]} />
    </mesh>
  )
}

/**
 * The stand-in: the project's initials, large, on the palette colour that board
 * is already keyed to. Reads as a designed plate rather than a missing asset,
 * which is the difference between a row that looks unfinished and one that
 * looks deliberate.
 */
function BoardPlate({ project, index }: { project: Project; index: number }) {
  const backing = useClayMaterial({ index })

  return (
    <group position={[0, 0, FACE_Z]}>
      <mesh material={backing}>
        <planeGeometry args={[FACE.width, FACE.height]} />
      </mesh>
      <Text
        font="/fonts/montserrat-700.ttf"
        position={[0, 0.1, 0.01]}
        fontSize={1.1}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.04}
      >
        {initials(project.name)}
      </Text>
      <Text
        font="/fonts/montserrat-700.ttf"
        position={[0, -0.78, 0.01]}
        fontSize={0.17}
        color="#ffffff"
        fillOpacity={0.7}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.26}
      >
        {String(index + 1).padStart(2, '0')}
      </Text>
    </group>
  )
}

function Board({
  project,
  index,
  active,
}: {
  project: Project
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
      <group
        position={[0, BOARD.height / 2 + 0.35, 0]}
        rotation={[0.16, 0, 0]}
      >
        <mesh material={material}>
          <boxGeometry args={[BOARD.width, BOARD.height, BOARD.depth]} />
        </mesh>
        {project.image ? (
          <BoardImage src={project.image} />
        ) : (
          <BoardPlate project={project} index={index} />
        )}
      </group>
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

  /**
   * The boards are solid, which is what the row's spacing was always for: 8.5m
   * apart and 4.2m wide leaves a 4.3m gap between each pair, so the row reads
   * as a run of hoardings you drive along and can still cut through, rather
   * than a wall.
   *
   * The collider ignores both the 0.16 rad lean and the lift an active board
   * takes — a static box through the middle of both is within a few
   * centimetres of the face at every point, and neither is worth a moving body.
   */
  const obstacles = useMemo<Obstacle[]>(
    () =>
      projects.map((_, i) => ({
        kind: 'box',
        position: toWorld(
          [zx, zz],
          (i - (projects.length - 1) / 2) * SPACING,
          -CONTENT_START
        ),
        halfExtents: [BOARD.width * 0.5, BOARD.height * 0.55, BOARD.depth],
        y: BOARD.height * 0.5 + 0.35,
        yaw: WORLD_YAW,
      })),
    [zx, zz]
  )
  useObstacles(obstacles)

  return (
    <group position={[zx, 0, zz]} rotation={[0, WORLD_YAW, 0]}>
      {projects.map((project, i) => {
        const x = (i - (projects.length - 1) / 2) * SPACING
        const isActive = activeIndex === i

        return (
          <group key={project.name} position={[x, 0, -CONTENT_START]}>
            <Board project={project} index={i + 2} active={isActive} />

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
