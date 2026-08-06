import { ZONE_LIST, type ZoneId } from './world'

/**
 * Where everything is, relative to where you are looking.
 *
 * The signposts solve wayfinding for the first twenty metres and then fade,
 * because past that they point at things you can see for yourself. That was
 * true when the map was three zones deep and it is not true anywhere in the
 * middle of it: the sections sit 39m to 109m out, the camera frames a two-metre
 * car, and between two markers there is a long stretch of gradient with no cue
 * in any direction. A driver who overshoots Work has nothing to steer by.
 *
 * So every zone that is off screen gets a chevron pinned to the edge nearest
 * it, with its name and how far away it is. On screen, it gets nothing — the
 * marker and its floating label are already there, and a second label stacked
 * over them is noise.
 *
 * These are plain mutable numbers rather than React state, for the same reason
 * `CarState` is: they change every frame and are read by a rAF loop that writes
 * transforms directly. A re-render per frame to move four chevrons would cost
 * more than the world they sit over.
 */

export type CompassMarker = {
  id: ZoneId
  label: string
  /**
   * Direction to the zone in normalised device coordinates, -1..1, with +y up.
   * Only meaningful while `onScreen` is false.
   */
  x: number
  y: number
  /** Metres from the car, for the readout. */
  distance: number
  /** True when the zone's own marker is already visible. */
  onScreen: boolean
  /** True once the probe has written real values. */
  live: boolean
}

/**
 * The intro is included, and named for what it is *from out here*.
 *
 * "KEVIN OTUTEYE" is the name lying on the ground at the middle of the map; as
 * a chevron on the edge of the screen it is a direction home, and a driver 90m
 * out at the back of Work needs that more than they need any of the others.
 */
function labelFor(id: ZoneId, label: string): string {
  return id === 'intro' ? 'START' : label
}

export const compassMarkers: CompassMarker[] = ZONE_LIST.map((zone) => ({
  id: zone.id,
  label: labelFor(zone.id, zone.label),
  x: 0,
  y: 0,
  distance: 0,
  onScreen: true,
  live: false,
}))

/**
 * How present the compass is, 0 to 1.
 *
 * It fades in over exactly the range the painted signposts fade out — see the
 * matching constants in `Signposts.tsx`. That is a handoff rather than a
 * coincidence: near the spawn the arrows on the floor already point at all four
 * zones, and running both at once puts eight labels on the opening frame for
 * four destinations. Past the arrows, the compass is the only thing left that
 * knows where anything is.
 */
export const compassState = { strength: 0 }

/** Matches Signposts.tsx. Below the first the arrows are at full strength;
 *  past the second they are gone. */
export const COMPASS_FADE = { start: 20, end: 34 }
