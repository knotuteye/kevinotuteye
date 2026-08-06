import { INTRO_SPAWN, toWorld, WORLD_YAW, ZONE_LIST } from './world'

/**
 * The ground that is already spoken for.
 *
 * Everything readable in this world is painted flat: role histories, project
 * blurbs, the name itself. Scenery is placed by seeded polar sampling, and a
 * ring with a circular hole in the middle is a fine description of "keep off
 * the marker" and a useless one for a section — Work's copy is a 16m x 80m
 * column yawed 38° off the world axes, and a boulder dropped anywhere along it
 * lands on type it renders through.
 *
 * So placement asks here first. A keep-out is an oriented rectangle on the
 * ground; anything that wants to occupy a spot tests against the whole set.
 * Declaring the areas is the part that has to be right — the test itself is
 * four comparisons.
 */

export type KeepOut = {
  /** Centre in world ground coordinates, [x, z]. */
  position: [number, number]
  /** Half-width (x) and half-depth (z) in the box's own frame. */
  halfExtents: [number, number]
  /** Ground-plane rotation. Content boxes are yawed to WORLD_YAW, like the copy. */
  yaw?: number
}

/** Is [x, z] inside this box, allowing for the placed thing's own footprint? */
function contains(box: KeepOut, x: number, z: number, pad: number): boolean {
  const dx = x - box.position[0]
  const dz = z - box.position[1]
  const yaw = box.yaw ?? 0
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)

  return (
    Math.abs(dx * cos - dz * sin) < box.halfExtents[0] + pad &&
    Math.abs(dx * sin + dz * cos) < box.halfExtents[1] + pad
  )
}

/** Is [x, z] clear of every one of these areas? */
export function isClear(
  boxes: readonly KeepOut[],
  x: number,
  z: number,
  pad = 0
): boolean {
  return !boxes.some((box) => contains(box, x, z, pad))
}

/**
 * Each section's whole territory, as the box its content actually occupies.
 *
 * Taken straight from `region` rather than restated, because the alternative is
 * two descriptions of one column that drift apart the first time a section
 * grows a row. `region` already means "everywhere this section's content may
 * be" — it is what decides you have arrived — so it is exactly the area nothing
 * else may stand in. The marker's own footprint is folded in: content starts
 * behind the gate, but the gate is drawn on the ground too.
 */
const ZONE_REGIONS: KeepOut[] = ZONE_LIST.map((zone) => {
  const near = zone.halfExtents[1]
  const far = -zone.region.depth

  return {
    position: toWorld(zone.position, 0, (near + far) / 2),
    halfExtents: [zone.region.halfWidth, (near - far) / 2],
    yaw: WORLD_YAW,
  }
})

/**
 * The name, which sticks out past the intro's region on the camera side — the
 * "FULL STACK · MUSIC" strapline sits at local z 5.2 and the region ends at 5.
 *
 * Kept as its own box rather than by widening the region because this one is
 * also what the signposts clear, and they must clear *the lettering*, not the
 * intro's territory. A sign for a zone is part of the intro; asking it to stand
 * outside the intro would push every arrow to the horizon.
 */
const INTRO_NAME: KeepOut = {
  position: toWorld([0, 0], 0, 1.35),
  halfExtents: [8.5, 5.4],
  yaw: WORLD_YAW,
}

/**
 * Where the car lands and the WASD keys sit.
 *
 * The keys are the first thing you drive into on purpose. Scenery dropped among
 * them turns the one deliberate collision in the world into an accident.
 */
const SPAWN_APRON: KeepOut = {
  position: toWorld(INTRO_SPAWN, -1.5, 1.5),
  halfExtents: [5.5, 5.5],
  yaw: WORLD_YAW,
}

/* ------------------------------------------------------------------ */
/* Signposts                                                           */
/* ------------------------------------------------------------------ */

/** Ring radius around the spawn, close enough that the signs fit the opening
 *  frame. Individual signs push out past this if they have to. */
const SIGN_RADIUS = 11
const SIGN_MAX_RADIUS = 30
/** The label sits ahead of its arrow, in the yawed frame the copy uses. */
export const SIGN_LABEL_OFFSET = 2.5

/**
 * Where the arrows around the intro go — placed here, next to the areas they
 * have to avoid, because placing them *is* a keep-out problem.
 *
 * About lies almost due -z of the spawn, which is straight through the middle
 * of "KEVIN OTUTEYE". A sign that lands on the name walks outward along its own
 * bearing until it clears, rather than every sign moving out to cover the one
 * bad case.
 *
 * The test is applied to the label as well as the arrow, and in the name's own
 * yawed frame. Testing the arrow alone in world axes — which is what this did —
 * cleared the chevron and left "ABOUT" lying across the K.
 */
export const SIGNPOSTS = ZONE_LIST.filter((zone) => zone.id !== 'intro').map(
  (zone) => {
    const [ix, iz] = INTRO_SPAWN
    const dx = zone.position[0] - ix
    const dz = zone.position[1] - iz
    const length = Math.hypot(dx, dz)
    const bearing: [number, number] = [dx / length, dz / length]

    // The label's offset is local to a WORLD_YAW group, so it reaches into
    // world space along both axes.
    const labelX = SIGN_LABEL_OFFSET * Math.sin(WORLD_YAW)
    const labelZ = SIGN_LABEL_OFFSET * Math.cos(WORLD_YAW)

    let x = ix + bearing[0] * SIGN_MAX_RADIUS
    let z = iz + bearing[1] * SIGN_MAX_RADIUS

    for (let radius = SIGN_RADIUS; radius <= SIGN_MAX_RADIUS; radius += 1) {
      const cx = ix + bearing[0] * radius
      const cz = iz + bearing[1] * radius
      const clear =
        isClear([INTRO_NAME], cx, cz, 1.6) &&
        isClear([INTRO_NAME], cx + labelX, cz + labelZ, 0.9)

      if (clear) {
        x = cx
        z = cz
        break
      }
    }

    // A group yaw θ sends local -z to (-sinθ, -cosθ); we want that to be
    // (dx, dz), hence the half turn.
    const heading = Math.atan2(dx, dz) + Math.PI

    return { id: zone.id, label: zone.label, x, z, heading }
  }
)

/** The arrow and its label, as one box in the frame the label is yawed to. */
const SIGN_AREAS: KeepOut[] = SIGNPOSTS.map((sign) => ({
  position: [
    sign.x + (SIGN_LABEL_OFFSET / 2) * Math.sin(WORLD_YAW),
    sign.z + (SIGN_LABEL_OFFSET / 2) * Math.cos(WORLD_YAW),
  ],
  halfExtents: [2.4, 3.2],
  yaw: WORLD_YAW,
}))

/**
 * Everything scenery has to stay off: the sections, the name, the spawn, and
 * the signs that get you to the sections.
 */
export const SCENERY_KEEP_OUT: readonly KeepOut[] = [
  ...ZONE_REGIONS,
  INTRO_NAME,
  SPAWN_APRON,
  ...SIGN_AREAS,
]
