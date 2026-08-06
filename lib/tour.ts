import { useSyncExternalStore } from 'react'
import { getCarState } from './car'
import { actions, getInputEpoch, joystick } from './controls'
import { toWorld, ZONES, type ZoneId } from './world'

/**
 * A hands-off lap of the world, for people who are not going to drive.
 *
 * Some visitors will not touch WASD — on a recruiter's laptop between two other
 * tabs, "there is a car" is not an offer they are going to take up, and the
 * fallback DOM layer is a worse version of the site rather than a different one.
 * The tour is the third option: the real world, the real car, driven for you.
 *
 * It is opt-in, and that is deliberate rather than lazy. The obvious place to
 * put it — behind `prefers-reduced-motion` — is exactly wrong: a camera flying
 * a hundred metres across a plain is *more* motion than the static page that
 * preference asks for, not less. Reduced motion keeps the DOM layer. This is
 * for anyone who wants to watch instead of steer, which is a different request.
 *
 * It drives through the joystick channel rather than through a bespoke path.
 * That is the whole trick: `updateSteering` already knows how to turn a car
 * toward an absolute heading, because a thumb needed it, so the autopilot is a
 * heading and a throttle and no new physics at all.
 */

type Waypoint = {
  zone: ZoneId
  /** In the zone's own yawed frame — the same coordinates its content uses. */
  local: [number, number]
  /** Seconds to sit here before moving on. */
  hold: number
}

/**
 * The gate first, then the content.
 *
 * Stopping at each marker and moving on would show the four signs and none of
 * the work, because every section's content lives behind its gate. So each zone
 * gets an arrival — which is what raises the fence, lifts the camera and
 * changes the URL — and then a second waypoint in among the thing itself.
 *
 * Ordered as a CV reads rather than as the map is laid out: work, then what
 * shipped, then background, then how to make contact. It ends at the plinths
 * and stays there, because driving home afterwards would end the tour on an
 * empty patch of floor instead of on the one screen with an address on it.
 */
const ROUTE: Waypoint[] = [
  { zone: 'work', local: [0, 0], hold: 1.2 },
  { zone: 'work', local: [0, -24], hold: 2.6 },
  { zone: 'projects', local: [0, 0], hold: 1.0 },
  { zone: 'projects', local: [-8.5, -9], hold: 2.2 },
  { zone: 'projects', local: [8.5, -9], hold: 2.2 },
  { zone: 'about', local: [0, 0], hold: 1.0 },
  { zone: 'about', local: [0, -13], hold: 3.0 },
  { zone: 'contact', local: [0, 0], hold: 1.0 },
  { zone: 'contact', local: [0, -7], hold: 4.0 },
]

/** Close enough to count as arrived. Inside every marker's short half-extent. */
const ARRIVE_RADIUS = 3.2
/** Past this the tour holds the boost down; the map is too big without it. */
const BOOST_BEYOND = 30
/**
 * Longest a single leg may take before the tour gives up and moves on.
 *
 * The car is driving real physics through real scenery, so it can be wedged
 * against a tree by bad luck. A tour that silently stops halfway is worse than
 * one that skips a stop, and this is cheaper than teaching the autopilot to
 * reverse out of things.
 */
const LEG_TIMEOUT = 22

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

let active = false
let index = 0
let holdRemaining = 0
let legElapsed = 0
let epochAtStart = 0

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function isTouring(): boolean {
  return active
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useTouring(): boolean {
  return useSyncExternalStore(subscribe, isTouring, () => false)
}

/** Hands the controls back, whether the tour finished or was interrupted. */
function release() {
  joystick.active = false
  actions.up = false
  actions.boost = false
  actions.brake = false
}

export function stopTour() {
  if (!active) return
  active = false
  release()
  emit()
}

export function startTour() {
  if (active) return
  active = true
  index = 0
  holdRemaining = 0
  legElapsed = 0
  // Anything after this instant is a person reaching for the controls, and the
  // tour yields to it. Sampled at the start rather than compared to zero
  // because by now the visitor has almost certainly pressed something.
  epochAtStart = getInputEpoch()
  emit()
}

export function toggleTour() {
  if (active) stopTour()
  else startTour()
}

function targetOf(waypoint: Waypoint): [number, number] {
  return toWorld(
    ZONES[waypoint.zone].position,
    waypoint.local[0],
    waypoint.local[1]
  )
}

/**
 * One step of the autopilot, called from the car's frame loop just before the
 * physics step reads `actions`.
 *
 * Returns nothing and mutates the shared control state, exactly as a thumb on
 * the joystick does — which is what keeps the car's own code ignorant of
 * whether it is being driven by a person.
 */
export function updateTour(deltaSeconds: number) {
  if (!active) return

  // Any real input ends it. No confirmation and no resume: someone who has
  // taken the wheel is done being driven around.
  if (getInputEpoch() !== epochAtStart) {
    stopTour()
    return
  }

  const car = getCarState()
  if (!car.ready) return

  const waypoint = ROUTE[index]
  if (!waypoint) {
    stopTour()
    return
  }

  if (holdRemaining > 0) {
    holdRemaining -= deltaSeconds
    // Held on the brake rather than merely off the throttle: the floor is
    // frictionless by design, so a car that simply stops asking to move keeps
    // coasting out the far side of the thing it stopped to look at.
    release()
    actions.brake = true
    if (holdRemaining <= 0) {
      index++
      legElapsed = 0
      if (index >= ROUTE.length) stopTour()
    }
    return
  }

  const [tx, tz] = targetOf(waypoint)
  const dx = tx - car.x
  const dz = tz - car.z
  const distance = Math.hypot(dx, dz)

  legElapsed += deltaSeconds

  if (distance < ARRIVE_RADIUS || legElapsed > LEG_TIMEOUT) {
    holdRemaining = waypoint.hold
    return
  }

  // Three's ground plane to the simulation's, which is the flip `toCannonGround`
  // applies — the car compares this against its own `angle`, which lives in
  // that frame.
  joystick.angle = Math.atan2(-dz, dx)
  joystick.active = true
  actions.up = true
  actions.brake = false
  actions.boost = distance > BOOST_BEYOND
}
