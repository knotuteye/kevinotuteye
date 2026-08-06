import { useMemo } from 'react'
import { contactPoints } from '../../../lib/content'
import { usePublishInteraction } from '../../../lib/interact'
import {
  CONTACT_COLUMNS,
  CONTACT_CONTENT_START,
  CONTACT_SPACING,
  CONTACT_STAND_OFFSET,
} from '../../../lib/layout'
import { useObstacles, type Obstacle } from '../../../lib/obstacles'
import { toWorld, WORLD_YAW, ZONES } from '../../../lib/world'
import { useClayMaterial } from '../Clay'
import GroundText from '../GroundText'
import GroundShadow from '../Shadow'
import { useNearest } from '../useNearest'

/**
 * The way out of the site, as a short row of plinths you drive along.
 *
 * Every other section here is evidence. This is the one that is meant to be
 * *used*, and it is built to be the shortest thing in the world: one row, five
 * posts, no copy to read. A visitor who came only for an address should be able
 * to arrive, see it, and act, without ever learning how the rest of the map
 * works.
 *
 * Plinths rather than boards because they carry a value rather than a picture —
 * a post with the handle painted on the ground in front of it reads the same at
 * a glance as it does parked, which a 4.2m screenshot does not.
 */

const PLINTH = { width: 1.0, height: 1.7, depth: 1.0 }
const CAP_HEIGHT = 0.26

function Plinth({ index, active }: { index: number; active: boolean }) {
  const body = useClayMaterial()
  const accent = useClayMaterial({ index })

  return (
    <group>
      <mesh material={body} position={[0, PLINTH.height / 2, 0]}>
        <boxGeometry args={[PLINTH.width, PLINTH.height, PLINTH.depth]} />
      </mesh>

      {/* The cap is the whole state indicator. A plinth that lifted or grew on
          approach would be a fifth thing in this world that moves when you get
          near it; recolouring the one part already keyed to the palette says
          "this one" without adding another animation to read. */}
      <mesh
        material={accent}
        position={[0, PLINTH.height + CAP_HEIGHT / 2, 0]}
        scale={active ? [1.28, 1.28, 1.28] : [1, 1, 1]}
      >
        <boxGeometry args={[PLINTH.width * 1.12, CAP_HEIGHT, PLINTH.depth * 1.12]} />
      </mesh>
    </group>
  )
}

export default function Contact() {
  const [zx, zz] = ZONES.contact.position

  const stands = useMemo(
    () =>
      CONTACT_COLUMNS.map((x) =>
        toWorld(
          [zx, zz],
          x,
          // Measured a little in front of the row, so a plinth wakes as you
          // pull up facing it rather than when you clip its base.
          -CONTACT_CONTENT_START + CONTACT_STAND_OFFSET
        )
      ),
    [zx, zz]
  )
  const activeIndex = useNearest(stands, CONTACT_SPACING * 0.85)

  const active = activeIndex === null ? null : contactPoints[activeIndex]

  /**
   * The published target, and the reason this section exists at all.
   *
   * `label` is phrased as the act rather than the noun — the prompt reads
   * "Press E to email kevinotuteye@gmail.com", which is a sentence that tells
   * you what is about to happen. "EMAIL" alone would not.
   */
  usePublishInteraction(
    'contact',
    active
      ? {
          label:
            active.id === 'email'
              ? `email ${active.handle}`
              : active.id === 'resume'
                ? 'download the résumé'
                : `open ${active.handle}`,
          href: active.href,
        }
      : null
  )

  const obstacles = useMemo<Obstacle[]>(
    () =>
      CONTACT_COLUMNS.map((x) => ({
        kind: 'box',
        position: toWorld([zx, zz], x, -CONTACT_CONTENT_START),
        halfExtents: [PLINTH.width / 2, PLINTH.height / 2, PLINTH.depth / 2],
        y: PLINTH.height / 2,
        yaw: WORLD_YAW,
      })),
    [zx, zz]
  )
  useObstacles(obstacles)

  return (
    <>
      {/* Outside the yawed group, in world coordinates — the sun offset is a
          world direction, so a shadow parented to the group below would take
          the section's yaw and origin a second time. */}
      {contactPoints.map((point, i) => (
        <GroundShadow
          key={`${point.id}-shadow`}
          position={toWorld([zx, zz], CONTACT_COLUMNS[i], -CONTACT_CONTENT_START)}
          size={[2.2, 2.2]}
          height={PLINTH.height}
          intensity={0.85}
          yaw={WORLD_YAW}
        />
      ))}

      <group position={[zx, 0, zz]} rotation={[0, WORLD_YAW, 0]}>
        {/* Between the gate and the row: local z runs -3.5 to 3.5 under the
            marker rectangle, and the plinths' own labels start at -7.3, so
            this is the only band of floor here that is actually free.

            Device-agnostic on purpose. The chrome names the key — or becomes
            the button, on touch — so a line of ground type saying "press E"
            would be wrong on every phone that read it. */}
        <GroundText
          position={[0, -CONTACT_CONTENT_START + 4.9]}
          size={0.44}
          anchorX="center"
          opacity={0.9}
          maxWidth={22}
        >
          {'PULL UP TO ONE'}
        </GroundText>

        {contactPoints.map((point, i) => {
          const x = CONTACT_COLUMNS[i]
          const isActive = activeIndex === i

          return (
            <group key={point.id} position={[x, 0, -CONTACT_CONTENT_START]}>
              <Plinth index={i + 1} active={isActive} />

              <GroundText
                position={[0, 2.2]}
                size={0.46}
                anchorX="center"
                letterSpacing={0.14}
              >
                {point.label}
              </GroundText>

              {/* The handle only appears for the near plinth. Five addresses
                  painted at once is a wall of small type from the driving
                  camera, and only one of them is ever actionable. */}
              {isActive ? (
                <GroundText
                  position={[0, 3.1]}
                  size={0.28}
                  anchorX="center"
                  opacity={0.7}
                  maxWidth={CONTACT_SPACING * 1.6}
                >
                  {point.handle}
                </GroundText>
              ) : null}
            </group>
          )
        })}
      </group>
    </>
  )
}
