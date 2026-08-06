import { useMemo } from 'react'
import { about, wrap } from '../../../lib/content'
import {
  ABOUT_BLOCKS,
  ABOUT_COL_WIDTH,
  ABOUT_SUMMARY_START,
  aboutColumnX,
} from '../../../lib/layout'
import { useObstacles, type Obstacle } from '../../../lib/obstacles'
import { toWorld, WORLD_YAW, ZONES } from '../../../lib/world'
import { useClayMaterial } from '../Clay'
import GroundText from '../GroundText'
import GroundShadow from '../Shadow'

/**
 * Background, painted flat on the ground in blocks — education, skills,
 * certifications, recognition, languages.
 *
 * Where the blocks fall is `lib/layout`'s answer, not this file's: the tour
 * drives to each one in turn, so the running cursor that stacks them has two
 * readers and belongs to neither.
 */

/** The pillar stands a little to the left of its block's copy. */
const PILLAR_OFFSET = -1.1

function Pillar({ index, x }: { index: number; x: number }) {
  const material = useClayMaterial({ index })
  return (
    <mesh material={material} position={[x, 0.55, 0]}>
      <cylinderGeometry args={[0.22, 0.28, 1.1, 6]} />
    </mesh>
  )
}

export default function AboutSection() {
  const [zx, zz] = ZONES.about.position

  const obstacles = useMemo<Obstacle[]>(
    () =>
      ABOUT_BLOCKS.map((block) => ({
        kind: 'cylinder',
        position: toWorld(
          [zx, zz],
          aboutColumnX(block.col) + PILLAR_OFFSET,
          -block.z
        ),
        radius: 0.28,
        height: 1.1,
        y: 0.55,
      })),
    [zx, zz]
  )
  useObstacles(obstacles)

  return (
    <>
      {/* Outside the yawed group, in world coordinates: the sun offset is a
          world direction, so a shadow parented to the group below would have
          the section's yaw and origin applied to it a second time and land
          nowhere near its pillar. */}
      {ABOUT_BLOCKS.map((block) => (
        <GroundShadow
          key={`${block.title}-shadow`}
          position={toWorld(
            [zx, zz],
            aboutColumnX(block.col) + PILLAR_OFFSET,
            -block.z
          )}
          size={[1.5, 1.5]}
          height={1.1}
          intensity={0.8}
        />
      ))}

      <group position={[zx, 0, zz]} rotation={[0, WORLD_YAW, 0]}>
        <GroundText
          position={[-ABOUT_COL_WIDTH, -ABOUT_SUMMARY_START]}
          size={0.42}
          opacity={0.92}
          maxWidth={26}
        >
          {wrap(about.summary, 74, 3)}
        </GroundText>

        {ABOUT_BLOCKS.map((block) => {
          const x = aboutColumnX(block.col)

          return (
            <group key={block.title} position={[x, 0, -block.z]}>
              <Pillar index={block.index} x={PILLAR_OFFSET} />

              <GroundText position={[0, 0]} size={0.6} letterSpacing={0.16}>
                {block.title}
              </GroundText>

              {block.lines.map((line, i) => (
                <GroundText
                  key={`${block.title}-${i}`}
                  position={[0, block.offsets[i]]}
                  size={0.29}
                  opacity={i % 2 === 0 ? 0.92 : 0.66}
                  maxWidth={ABOUT_COL_WIDTH - 1}
                >
                  {line}
                </GroundText>
              ))}
            </group>
          )
        })}
      </group>
    </>
  )
}
