import { useSyncExternalStore } from 'react'

/**
 * The world map, in metres.
 *
 * There is no page grid here — "layout" is a set of positions on a plane, and
 * navigation means moving the camera between them. Coordinates are [x, z] on
 * the ground; three is Y-up, so y is height and z runs away from the viewer.
 */
export type ZoneId = 'intro' | 'work' | 'projects' | 'about'

/**
 * The camera sits off-axis, so anything lying flat on the ground has to be
 * yawed to match or it reads on a diagonal. This is the ground-plane azimuth of
 * the default camera angle — every flat decal and every line of ground text
 * rotates by it.
 */
export const WORLD_YAW = Math.atan2(1.135, 1.45)

/**
 * Maps a point inside a section's local (yawed) space to world ground
 * coordinates.
 *
 * Sections render inside `<group position={[zx,0,zz]} rotation={[0,WORLD_YAW,0]}>`,
 * but shadows and camera targets have to be expressed in world axes — shadows
 * because the sun offset is a world direction, camera targets because the
 * camera lives outside the group. Doing that conversion by hand at each call
 * site is how it silently goes wrong, so it lives here.
 */
export function toWorld(
  origin: [number, number],
  localX: number,
  localZ: number
): [number, number] {
  const sin = Math.sin(WORLD_YAW)
  const cos = Math.cos(WORLD_YAW)
  return [
    origin[0] + localX * cos + localZ * sin,
    origin[1] - localX * sin + localZ * cos,
  ]
}

/**
 * The inverse of `toWorld`: a world ground position in a section's local
 * (yawed) space, relative to its origin.
 *
 * Anything that has to reason about *where in a section* something is — is the
 * car on the marker, is it still in the region — has to ask in this frame. An
 * axis-aligned test in world space would be a box at 38° to the content it is
 * meant to describe.
 */
export function toLocal(
  origin: [number, number],
  x: number,
  z: number
): [number, number] {
  const dx = x - origin[0]
  const dz = z - origin[1]
  const cos = Math.cos(WORLD_YAW)
  const sin = Math.sin(WORLD_YAW)
  return [dx * cos - dz * sin, dx * sin + dz * cos]
}

export type Zone = {
  id: ZoneId
  label: string
  route: string
  /** Ground position [x, z]. */
  position: [number, number]
  /** Half-width and half-depth of the marker rectangle drawn on the ground. */
  halfExtents: [number, number]
  /**
   * The section's whole territory, in its local (yawed) space: how far its
   * content runs behind the marker, and how wide it spreads.
   *
   * Separate from `halfExtents` because the marker is a gate, not the room. A
   * section's content runs up to 60m behind its marker, so testing the marker
   * alone would report you as having left Work the moment you drove past the
   * sign to read it — and take the URL and the reading camera angle with you.
   */
  region: { halfWidth: number; depth: number }
}

/**
 * Is this ground position inside the section's territory?
 *
 * Sections are laid out inside a group yawed by WORLD_YAW, so containment is
 * tested in that same local frame — an axis-aligned test in world space would
 * be a box at 38° to the content it is meant to contain.
 */
export function isInsideZone(zone: Zone, x: number, z: number): boolean {
  const [localX, localZ] = toLocal(zone.position, x, z)

  return (
    Math.abs(localX) < zone.region.halfWidth &&
    localZ < zone.halfExtents[1] &&
    localZ > -zone.region.depth
  )
}

/**
 * The zones stay spread out — Work alone runs some 60m of roles behind its
 * marker, so pulling them toward the origin would fold one section's content
 * into the next. What changed is that they are now *reachable*: you drive.
 * Finding them is the signposts' job, not the layout's.
 */
export const ZONES: Record<ZoneId, Zone> = {
  intro: {
    id: 'intro',
    label: 'KEVIN OTUTEYE',
    route: '/',
    position: [0, 0],
    halfExtents: [9, 5],
    region: { halfWidth: 12, depth: 8 },
  },
  work: {
    id: 'work',
    label: 'WORK',
    route: '/work',
    position: [55, -10],
    halfExtents: [6, 3.5],
    // Eight roles at 7.5m spacing, plus the run-up to the first one — which is
    // long, because an open role's copy runs back toward the marker.
    region: { halfWidth: 16, depth: 74 },
  },
  projects: {
    id: 'projects',
    label: 'PROJECTS',
    route: '/projects',
    position: [-58, -18],
    halfExtents: [6, 3.5],
    // Wide rather than deep: the boards stand in a row you drive along.
    region: { halfWidth: 22, depth: 20 },
  },
  about: {
    id: 'about',
    label: 'ABOUT',
    route: '/about',
    position: [2, -98],
    halfExtents: [6, 3.5],
    region: { halfWidth: 30, depth: 40 },
  },
}

export const ZONE_LIST = Object.values(ZONES)

/**
 * Where the car lands on a cold start: clear of the name's lettering, on the
 * camera's side of it, facing the world.
 *
 * Shared rather than local to the world component because the signposts ring
 * this point rather than the origin. The camera frames the car, so a ring
 * centred 11m away would push the sign for whichever zone lies behind the
 * driver off the edge of the screen — which, on the one screen whose whole job
 * is to show you where you can go, is the entire problem to be avoided.
 */
export const INTRO_SPAWN: [number, number] = [0, 11]

export function zoneForRoute(route: string): Zone {
  return ZONE_LIST.find((z) => z.route === route) ?? ZONES.intro
}

/* ------------------------------------------------------------------ */
/* Occupancy                                                           */
/* ------------------------------------------------------------------ */

/**
 * Which zone the car is currently standing in, or null out on the open floor.
 *
 * This replaced a focus target. The distinction matters: focus was something
 * the site chose and the camera obeyed, whereas this is a *fact about where
 * the car is* that several things independently react to — the camera lifts to
 * a reading angle, the tilt-shift eases off, the section opens its nearest
 * item. Nothing here moves the car.
 */
type WorldState = {
  activeZone: ZoneId | null
}

let state: WorldState = { activeZone: null }
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function getWorldState(): WorldState {
  return state
}

export function setActiveZone(activeZone: ZoneId | null) {
  if (state.activeZone === activeZone) return
  state = { activeZone }
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useWorldState(): WorldState {
  return useSyncExternalStore(
    subscribe,
    getWorldState,
    () => state
  )
}
