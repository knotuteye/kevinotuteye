import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { experience, splitCompany, wrap } from '../../../lib/content'
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

const ROW_SPACING = 7.5
const MARKER_HEIGHT = 0.9
/** Clears the zone marker's footprint so rows never sit under it. */
const CONTENT_START = 7

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

  // Anchored on local x=0 — the lane the car drives down — rather than on the
  // text at x=-4. Measuring to the text puts every row a constant 4m of lateral
  // offset away before the driver has moved at all, which eats most of the
  // radius and leaves rows that never open.
  //
  // The radius overlaps its neighbours slightly; `useNearest` takes the closest,
  // so one role is always open rather than blinking off between rows.
  const rows = useMemo(
    () =>
      experience.map((_, i) =>
        toWorld([zx, zz], 0, -(CONTENT_START + i * ROW_SPACING))
      ),
    [zx, zz]
  )
  const activeIndex = useNearest(rows, ROW_SPACING * 0.8)

  return (
    <group position={[zx, 0, zz]} rotation={[0, WORLD_YAW, 0]}>
      {experience.map((role, i) => {
        const z = -(CONTENT_START + i * ROW_SPACING)
        const { name, location } = splitCompany(role.company)
        const isActive = activeIndex === i
        const id = `work-${i}`

        return (
          <group key={id} position={[0, 0, z]}>
            <RoleMarker index={i} x={-9} z={0} active={isActive} />
            <GroundShadow
              position={toWorld([zx, zz], -9, z)}
              size={[1.6, 1.6]}
              height={MARKER_HEIGHT}
              intensity={0.8}
            />

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
                      position={[-7.4, 4.1 + p * 1.15]}
                      size={0.36}
                      opacity={0.95}
                    >
                      {`› ${project.name}`}
                    </GroundText>
                    <GroundText
                      position={[-7.0, 4.68 + p * 1.15]}
                      size={0.26}
                      opacity={0.62}
                    >
                      {project.technologies.slice(0, 8).join('  ·  ')}
                    </GroundText>
                  </group>
                ))}
              </group>
            ) : null}
          </group>
        )
      })}
    </group>
  )
}
