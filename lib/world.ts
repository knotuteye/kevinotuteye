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

export type Zone = {
  id: ZoneId
  label: string
  route: string
  /** Ground position [x, z]. */
  position: [number, number]
  /** Half-width and half-depth of the interactive footprint. */
  halfExtents: [number, number]
  /**
   * Where the camera should actually look when this zone is focused, in the
   * section's local (yawed) space. The marker sits at the entrance; the content
   * lies beyond it, so framing the marker would leave the content off-screen.
   */
  focusLocal: [number, number]
  /** Camera pull-back when focused, for sections that need more room. */
  focusDistance?: number
}

export const ZONES: Record<ZoneId, Zone> = {
  intro: {
    id: 'intro',
    label: 'KEVIN OTUTEYE',
    route: '/',
    position: [0, 0],
    halfExtents: [9, 5],
    focusLocal: [0, 0],
  },
  work: {
    id: 'work',
    label: 'WORK',
    route: '/work',
    position: [55, -10],
    halfExtents: [6, 3.5],
    // Frames the first two roles; the rest recede behind them.
    focusLocal: [-2.5, -11],
    focusDistance: 22,
  },
  projects: {
    id: 'projects',
    label: 'PROJECTS',
    route: '/projects',
    position: [-58, -18],
    halfExtents: [6, 3.5],
    focusLocal: [0, -8],
    focusDistance: 36,
  },
  about: {
    id: 'about',
    label: 'ABOUT',
    route: '/about',
    position: [2, -98],
    halfExtents: [6, 3.5],
    focusLocal: [-2, -13],
    focusDistance: 42,
  },
}

export const ZONE_LIST = Object.values(ZONES)

export function zoneForRoute(route: string): Zone {
  return ZONE_LIST.find((z) => z.route === route) ?? ZONES.intro
}

/* ------------------------------------------------------------------ */
/* Focus state                                                         */
/* ------------------------------------------------------------------ */

/**
 * What the camera is currently looking at. Generalised beyond zones so that
 * individual pieces of content — a role, a project — can be focused too,
 * which is how you read detail in a world with no scrollbar.
 */
export type FocusTarget = {
  id: string
  /** Ground position [x, z]. */
  position: [number, number]
  /** Zone-level framing pulls back; item-level framing comes in close. */
  scope: 'zone' | 'item'
  /** Overrides the scope's default camera distance. */
  distance?: number
}

/**
 * Deliberately a tiny external store rather than context: the camera reads it
 * every frame inside useFrame, where a re-render per change would be wasteful.
 */
type WorldState = {
  focus: FocusTarget | null
  hovered: string | null
}

let state: WorldState = { focus: null, hovered: null }
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function getWorldState(): WorldState {
  return state
}

export function setFocus(focus: FocusTarget | null) {
  if (state.focus?.id === focus?.id) return
  state = { ...state, focus }
  emit()
}

export function focusZone(zone: Zone) {
  setFocus({
    id: zone.id,
    position: toWorld(zone.position, ...zone.focusLocal),
    scope: 'zone',
    distance: zone.focusDistance,
  })
}

export function setHovered(hovered: string | null) {
  if (state.hovered === hovered) return
  state = { ...state, hovered }
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
