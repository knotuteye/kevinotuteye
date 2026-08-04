import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { experience, splitCompany, wrap } from '../../../lib/content'
import {
  getWorldState,
  setFocus,
  setHovered,
  toWorld,
  WORLD_YAW,
  ZONES,
} from '../../../lib/world'
import { useClayMaterial } from '../Clay'
import GroundText from '../GroundText'
import GroundShadow from '../Shadow'

/**
 * Work history, laid out as a column of ground entries running away from the
 * camera — newest nearest, oldest furthest, so the layout itself is the
 * chronology.
 *
 * Each role is clickable. Focusing one pulls the camera in and reveals its
 * detail: what the company does, what shipped there, and the stack. That
 * expand-on-focus is what lets eight roles live in a space that only ever
 * shows two or three at a time.
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const hoverRef = useRef<number | null>(null)

  // Keep local expansion in step with the camera: stepping away from this zone
  // collapses whatever was open.
  useFrame(() => {
    const focus = getWorldState().focus
    if (!focus?.id.startsWith('work-') && activeIndex !== null) {
      setActiveIndex(null)
    }
  })

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

            {/* Interaction footprint for this row. */}
            <mesh
              position={[-1, 0.04, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              visible={false}
              onPointerOver={() => {
                hoverRef.current = i
                setHovered(id)
                document.body.style.cursor = 'pointer'
              }}
              onPointerOut={() => {
                if (hoverRef.current === i) {
                  hoverRef.current = null
                  setHovered(null)
                  document.body.style.cursor = ''
                }
              }}
              onClick={(e) => {
                e.stopPropagation()
                setActiveIndex(isActive ? null : i)
                setFocus({
                  id,
                  position: toWorld([zx, zz], -4, z - 1.5),
                  scope: 'item',
                })
              }}
            >
              <planeGeometry args={[18, ROW_SPACING * 0.92]} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
