import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { experience, splitCompany, wrap } from '../../../lib/content'
import { usePublishInteraction } from '../../../lib/interact'
import {
  WORK_MARKER_X,
  WORK_ROW_SPACING,
  WORK_ROWS,
} from '../../../lib/layout'
import { useObstacles, type Obstacle } from '../../../lib/obstacles'
import { toWorld, WORLD_YAW, ZONES } from '../../../lib/world'
import { useClayMaterial } from '../Clay'
import GroundText from '../GroundText'
import GroundShadow from '../Shadow'
import { useNearest } from '../useNearest'

/**
 * Work history, laid out as a column of ground entries running away from the
 * camera — newest nearest, oldest furthest, so the layout itself is the
 * chronology.
 *
 * Drive up to a role and it opens: what the company does, what shipped there,
 * and the stack. That expand-on-approach is what lets eight roles live in a
 * column you only ever read two or three of at a time, and it means the column
 * is read by driving down it rather than by clicking along it.
 */

/** Pitch of the project entries inside an open row — a name and its stack. */
const PROJECT_SPACING = 1.5
/**
 * A stack list is one long line of tool names and nothing bounded it, so the
 * worst of them ran 17m from a column 15m wide — out past the copy, past the
 * marker, and into the ground the scenery is placed on. Two lines here is
 * fine; PROJECT_SPACING is set to absorb the second.
 */
const STACK_WIDTH = 13.5
const MARKER_HEIGHT = 0.9

function RoleMarker({
  index,
  x,
  z,
  active,
}: {
  index: number
  x: number
  z: number
  active: boolean
}) {
  const material = useClayMaterial({ index })
  const ref = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (!ref.current) return
    const targetY = active ? MARKER_HEIGHT * 0.85 : MARKER_HEIGHT * 0.5
    ref.current.position.y += (targetY - ref.current.position.y) * 0.12
  })

  return (
    <mesh ref={ref} material={material} position={[x, MARKER_HEIGHT * 0.5, z]}>
      <boxGeometry args={[0.55, MARKER_HEIGHT, 0.55]} />
    </mesh>
  )
}

export default function Work() {
  const [zx, zz] = ZONES.work.position

  // The row anchors are `WORK_ROWS`, on the lane the car drives down — see
  // `lib/layout`, which owns the pitch because the tour needs it too.
  //
  // The radius overlaps its neighbours slightly; `useNearest` takes the closest,
  // so one role is always open rather than blinking off between rows.
  const rows = useMemo(
    () => WORK_ROWS.map((z) => toWorld([zx, zz], 0, z)),
    [zx, zz]
  )
  const activeIndex = useNearest(rows, WORK_ROW_SPACING * 0.8)

  /**
   * A role opens the first of its projects that shipped somewhere public.
   *
   * A role has no URL of its own — the company might, but a link to a former
   * employer's homepage is not evidence of anything — so the target is the work
   * itself. Nine of these exist across the eight roles and they are the only
   * proof in this section that any of it went live.
   */
  const activeRole = activeIndex === null ? null : experience[activeIndex]
  const activeLink = activeRole?.projects.find((project) => project.link)
  usePublishInteraction(
    'work',
    activeLink
      ? { label: `open ${activeLink.name.toLowerCase()}`, href: activeLink.link }
      : null
  )

  // The markers stand at the edge of the column, well off the lane the car
  // drives down, so making them solid costs the reader nothing and gives the
  // one piece of geometry in this section some weight.
  const obstacles = useMemo<Obstacle[]>(
    () =>
      WORK_ROWS.map((z) => ({
        kind: 'box',
        position: toWorld([zx, zz], WORK_MARKER_X, z),
        halfExtents: [0.275, MARKER_HEIGHT * 0.5, 0.275],
        y: MARKER_HEIGHT * 0.5,
        yaw: WORLD_YAW,
      })),
    [zx, zz]
  )
  useObstacles(obstacles)

  return (
    <>
      {/* Outside the yawed group, in world coordinates: the sun offset is a
          world direction, and a shadow mounted inside the group below would
          have it rotated by WORLD_YAW and translated by the section's origin a
          second time — landing it a section's width away from its marker. */}
      {WORK_ROWS.map((z, i) => (
        <GroundShadow
          key={`work-shadow-${i}`}
          position={toWorld([zx, zz], WORK_MARKER_X, z)}
          size={[1.6, 1.6]}
          height={MARKER_HEIGHT}
          intensity={0.8}
        />
      ))}

      <group position={[zx, 0, zz]} rotation={[0, WORLD_YAW, 0]}>
        {experience.map((role, i) => {
          const z = WORK_ROWS[i]
          const { name, location } = splitCompany(role.company)
          const isActive = activeIndex === i
          const id = `work-${i}`

          return (
            <group key={id} position={[0, 0, z]}>
              <RoleMarker index={i} x={WORK_MARKER_X} z={0} active={isActive} />

              <GroundText
                position={[-7.9, -0.75]}
                size={0.88}
                letterSpacing={0.05}
              >
                {name}
              </GroundText>

              <GroundText position={[-7.9, 0.15]} size={0.42} opacity={0.92}>
                {role.role}
              </GroundText>

              <GroundText position={[-7.9, 0.85]} size={0.34} opacity={0.7}>
                {`${role.startDate} — ${role.endDate}${location ? `  ·  ${location}` : ''}`}
              </GroundText>

              {isActive ? (
                <group>
                  <GroundText
                    position={[-7.9, 2.1]}
                    size={0.33}
                    opacity={0.85}
                    maxWidth={17}
                  >
                    {wrap(role.aboutCompany, 74, 3)}
                  </GroundText>

                  {role.projects.slice(0, 3).map((project, p) => (
                    <group key={project.name}>
                      <GroundText
                        position={[-7.4, 4.1 + p * PROJECT_SPACING]}
                        size={0.36}
                        opacity={0.95}
                      >
                        {`› ${project.name}`}
                      </GroundText>
                      <GroundText
                        position={[-7.0, 4.68 + p * PROJECT_SPACING]}
                        size={0.26}
                        opacity={0.62}
                        maxWidth={STACK_WIDTH}
                      >
                        {project.technologies.slice(0, 6).join('  ·  ')}
                      </GroundText>
                    </group>
                  ))}
                </group>
              ) : null}
            </group>
          )
        })}
      </group>
    </>
  )
}
