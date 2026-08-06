import { isClear, SCENERY_KEEP_OUT } from './keepout'
import { mulberry32, range } from './rng'

/**
 * Where every rock, tree, crate and cone stands.
 *
 * Placement used to live in the components, one seeded ring each, and that is
 * why the plain had two kinds of overlap in it. A ring knows its own hole and
 * nothing else: not the copy painted across it, and not the eight other rings
 * it intersects — which is how you get a boulder inside a tree, and a tree on
 * top of a role.
 *
 * So the whole field is solved once, here, before anything renders. Fields are
 * laid in declared order and each prop claims a disc that every later prop has
 * to miss; a candidate that lands on content or on something already placed is
 * simply resampled. Doing it eagerly at module scope rather than per component
 * is what makes it deterministic — the answer cannot depend on which ring
 * React happens to render first.
 *
 * A prop that cannot find room after `ATTEMPTS` tries is dropped rather than
 * forced. Fields overlapping a section come out sparser, which is the correct
 * outcome: that ground belongs to the copy.
 */

export type Field = {
  center: [number, number]
  /** Nothing inside this radius — the ring's own hole. */
  innerRadius: number
  radius: number
  count: number
  seed: number
}

export type ScatterItem = {
  kind: 'rock' | 'tree'
  x: number
  z: number
  scale: number
  rotation: number
  /** Which material variant, and for trees which silhouette. */
  variant: number
  shape: number
}

export type ClutterItem = {
  kind: 'crate' | 'cone'
  x: number
  z: number
  scale: number
  size: number
  rotation: number
}

/** Tries before a prop gives up its spot. Cheap — this runs once, at import. */
const ATTEMPTS = 24
/** Breathing room between neighbouring props, on top of their own radii. */
const PROP_GAP = 0.7
/** How far a prop's silhouette reaches from its centre, per kind. */
const FOOTPRINT = {
  rock: 0.75,
  tree: 0.95,
  crate: 0.8,
  cone: 0.65,
} as const

type Claim = { x: number; z: number; radius: number }

/** Discs claimed so far, across every field. */
const claimed: Claim[] = []

function fits(x: number, z: number, radius: number): boolean {
  if (!isClear(SCENERY_KEEP_OUT, x, z, radius)) return false

  return !claimed.some(
    (claim) =>
      Math.hypot(claim.x - x, claim.z - z) < claim.radius + radius + PROP_GAP
  )
}

/**
 * A free spot in the ring, or null if the ring is too crowded to hold another.
 *
 * The RNG is consumed once per attempt rather than once per prop, so the field
 * is still stable across reloads but is not the same field it was before this
 * existed — there is no arrangement to preserve, only the property that it does
 * not change under you.
 */
function place(
  rand: () => number,
  field: Field,
  radius: number
): [number, number] | null {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const angle = rand() * Math.PI * 2
    const dist = range(rand, field.innerRadius, field.radius)
    const x = field.center[0] + Math.cos(angle) * dist
    const z = field.center[1] + Math.sin(angle) * dist

    if (fits(x, z, radius)) {
      claimed.push({ x, z, radius })
      return [x, z]
    }
  }
  return null
}

/**
 * Loose stuff, kept to the approaches rather than spread everywhere. A field of
 * knockable props by every marker would turn arriving at a section into an
 * obstacle course; near the intro and on the runs out to each zone, it is the
 * reason to take the long way round.
 */
export const CLUTTER_FIELDS: Field[] = [
  { center: [0, 4], seed: 101, count: 14, innerRadius: 7, radius: 16 },
  { center: [30, -8], seed: 102, count: 10, innerRadius: 6, radius: 15 },
  { center: [-32, -14], seed: 103, count: 10, innerRadius: 6, radius: 15 },
  { center: [0, -55], seed: 104, count: 10, innerRadius: 6, radius: 15 },
  /* The run out to Contact, which is short enough that without something to
     drive around it is a straight line across bare gradient. */
  { center: [-18, 20], seed: 105, count: 8, innerRadius: 5, radius: 12 },
]

/**
 * Scenery, over enough centres to cover the drive.
 *
 * Forty-six props across a map a hundred metres deep left long stretches of
 * bare gradient, which is what made this read as a diagram of a place rather
 * than a place. The extra centres matter more than the extra counts: four rings
 * of scenery still leaves everything between them empty, and the drive between
 * markers is most of the time anyone spends here.
 */
export const SCATTER_FIELDS: Field[] = [
  { center: [0, 2], seed: 11, count: 22, innerRadius: 13, radius: 26 },
  { center: [34, -36], seed: 22, count: 16, innerRadius: 20, radius: 34 },
  { center: [-58, -26], seed: 33, count: 16, innerRadius: 20, radius: 34 },
  { center: [-2, -110], seed: 44, count: 16, innerRadius: 20, radius: 34 },

  /* The corridors between sections, which had nothing in them at all. */
  { center: [28, 6], seed: 55, count: 12, innerRadius: 11, radius: 24 },
  { center: [-30, -2], seed: 66, count: 12, innerRadius: 11, radius: 24 },
  { center: [8, -56], seed: 77, count: 14, innerRadius: 12, radius: 26 },
  { center: [-36, -74], seed: 88, count: 12, innerRadius: 12, radius: 26 },

  /* Around Contact. The nearest existing field reaches 26m from the origin and
     the plinths stand 39m out, so without this the newest zone is the one patch
     of the map with nothing standing anywhere near it — which reads less as
     "quiet corner" than as "unfinished". */
  { center: [-34, 30], seed: 99, count: 14, innerRadius: 15, radius: 30 },
]

function buildClutter(field: Field): ClutterItem[] {
  const rand = mulberry32(field.seed)
  const items: ClutterItem[] = []

  for (let i = 0; i < field.count; i++) {
    const scale = range(rand, 0.7, 1.15)
    const kind = rand() > 0.45 ? 'crate' : ('cone' as const)
    const size = 0.55 * scale
    const rotation = rand() * Math.PI * 2

    const spot = place(rand, field, FOOTPRINT[kind] * scale)
    if (!spot) continue

    items.push({ kind, x: spot[0], z: spot[1], scale, size, rotation })
  }

  return items
}

function buildScatter(field: Field): ScatterItem[] {
  const rand = mulberry32(field.seed)
  const items: ScatterItem[] = []

  for (let i = 0; i < field.count; i++) {
    const kind = rand() > 0.55 ? 'tree' : ('rock' as const)
    const scale = range(rand, 0.6, 1.5)
    const rotation = rand() * Math.PI * 2
    const variant = Math.floor(rand() * 3)
    const shape = Math.floor(rand() * 3)

    const spot = place(rand, field, FOOTPRINT[kind] * scale)
    if (!spot) continue

    items.push({ kind, x: spot[0], z: spot[1], scale, rotation, variant, shape })
  }

  return items
}

/**
 * Clutter first: it is the deliberate stuff, sited to be driven through, and it
 * should get the spot it was aimed at. Scenery fills in around it.
 */
export const SCENERY = {
  clutter: CLUTTER_FIELDS.map(buildClutter),
  scatter: SCATTER_FIELDS.map(buildScatter),
}
