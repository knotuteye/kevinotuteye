import { useSyncExternalStore } from 'react'
import { CAR, getCarState } from './car'
import { actions, getInputEpoch, joystick } from './controls'
import {
  ABOUT_BLOCKS,
  ABOUT_COL_WIDTH,
  ABOUT_SUMMARY_START,
  aboutColumnX,
  CONTACT_COLUMNS,
  CONTACT_CONTENT_START,
  CONTACT_STAND_OFFSET,
  PROJECT_COLUMNS,
  PROJECT_CONTENT_START,
  PROJECT_STAND_OFFSET,
  WORK_ROWS,
} from './layout'
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

/* ------------------------------------------------------------------ */
/* The route                                                           */
/* ------------------------------------------------------------------ */

/**
 * How long a stop lasts, by what there is to read at it.
 *
 * These are the whole answer to "is the tour too fast". An open role is a
 * heading, three lines about the company and three projects with their stacks —
 * call it forty words, which is four seconds at a glance-reading pace, not two.
 * A board is a name, a blurb and a stack list. A contact plinth is a label and
 * an address, and the row of them is read by driving along it rather than by
 * stopping at each.
 */
const HOLD = {
  marker: 1.2,
  role: 4.2,
  project: 3.6,
  summary: 3.4,
  block: 3.0,
  /** Skills is four times the height of the other blocks. */
  tallBlock: 4.6,
  plinth: 2.0,
  /** The last stop, which is where the tour leaves you. */
  final: 5.0,
}

/**
 * Every gate, and then every single thing behind it.
 *
 * The old route stopped at four markers and sampled two or three points among
 * the content, which showed the shape of the site and almost none of the site.
 * A tour of a CV that skips five of the eight roles is a trailer, and the
 * visitors this exists for — the ones who will not drive — are exactly the ones
 * who then never see them.
 *
 * So it is built from `lib/layout` rather than hand-typed: the stops *are* the
 * anchors the sections render at, so adding a role or a project adds a stop and
 * there is no second list to remember. Each zone still gets its marker first —
 * that is what raises the fence, lifts the camera and changes the URL — and
 * then the content, in the order it is laid out to be read.
 *
 * Ordered as a CV reads rather than as the map is laid out: work, then what
 * shipped, then background, then how to make contact. It ends on the plinths
 * and stays there, because driving home afterwards would end the tour on an
 * empty patch of floor instead of on the one screen with an address on it.
 */
const ROUTE: Waypoint[] = [
  { zone: 'work', local: [0, 0], hold: HOLD.marker },
  // Down the lane, one stop per role, newest first — which is the order the
  // column is laid out in.
  ...WORK_ROWS.map<Waypoint>((z) => ({
    zone: 'work',
    local: [0, z],
    hold: HOLD.role,
  })),

  { zone: 'projects', local: [0, 0], hold: HOLD.marker },
  // Along the row, pulling up in front of each board where it opens.
  ...PROJECT_COLUMNS.map<Waypoint>((x) => ({
    zone: 'projects',
    local: [x, -PROJECT_CONTENT_START + PROJECT_STAND_OFFSET],
    hold: HOLD.project,
  })),

  { zone: 'about', local: [0, 0], hold: HOLD.marker },
  { zone: 'about', local: [-1, -ABOUT_SUMMARY_START], hold: HOLD.summary },
  // A block is anchored on its title and its lines run back toward the camera,
  // so the middle of the block — not its title — is what the camera should be
  // centred on.
  ...ABOUT_BLOCKS.map<Waypoint>((block) => ({
    zone: 'about',
    local: [
      aboutColumnX(block.col) + (ABOUT_COL_WIDTH - 1) / 2,
      -block.z + block.height / 2,
    ],
    hold: block.height > 6 ? HOLD.tallBlock : HOLD.block,
  })),

  { zone: 'contact', local: [0, 0], hold: HOLD.marker },
  // Every plinth: only the near one shows its handle, so a single stop in the
  // middle of the row would show one address and four labels.
  ...CONTACT_COLUMNS.map<Waypoint>((x, i) => ({
    zone: 'contact',
    local: [x, -CONTACT_CONTENT_START + CONTACT_STAND_OFFSET],
    hold: i === CONTACT_COLUMNS.length - 1 ? HOLD.final : HOLD.plinth,
  })),
]

/* ------------------------------------------------------------------ */
/* Driving                                                             */
/* ------------------------------------------------------------------ */

/** Close enough to count as arrived. Inside every marker's short half-extent,
 *  and inside half the pitch of the tightest row (the boards, at 8.5m). */
const ARRIVE_RADIUS = 2.8
/** Past this the tour holds the boost down; the map is too big without it. */
const BOOST_BEYOND = 30

/**
 * The speed the autopilot eases down to as it arrives, and how early it starts.
 *
 * Without this the tour drove every leg flat out and stopped by standing on the
 * brake, which was survivable on four long hauls between markers and is not on
 * twenty-seven stops that are ten metres apart — the car spent each leg
 * accelerating and each arrival skidding past the thing it came to show. The
 * throttle is gated on a target speed that falls off with distance instead, so
 * the car rolls up to a stop and the content is legible on the way in rather
 * than only once it has settled.
 */
const APPROACH_WITHIN = 18
/** Fraction of cruising speed still asked for at the arrival radius. */
const APPROACH_FLOOR = 0.18
/** Metres per millisecond, per the note at the top of `lib/car`. */
const CRUISE = CAR.controlsAcceleratingMaxSpeed
/** Over target by this much and the tour brakes rather than merely coasts. */
const OVERSPEED = 1.25

/**
 * Getting unstuck.
 *
 * The car is driving real physics through real scenery — and, since the name
 * became solid, through real lettering — so it can end a leg pressed against a
 * tree with the throttle wide open and nowhere to go. This used to be handled
 * by waiting out `LEG_TIMEOUT` and skipping the stop, which is a tour that
 * silently misses things.
 *
 * Stuck is "asking to move, not moving, and no closer than it has been". Speed
 * is the load-bearing half of that: a car swinging through a wide turn at the
 * start of a leg is also getting no closer, and treating that as wedged would
 * have the tour reversing out of every corner.
 *
 * The recovery is a person's: back off with the wheel over, which swings the
 * nose clear rather than reversing straight back into the same trunk. The side
 * alternates, so a second attempt does not retrace the first.
 */
const STALLED_AFTER = 2.2
const REVERSE_FOR = 1.4
/** Distance that counts as having got somewhere. */
const PROGRESS_EPSILON = 0.35
/** Below this the car is not going anywhere, whatever it has been asked to do. */
const MOVING_SPEED = 0.0025

/**
 * Longest a single leg may take before the tour gives up and moves on.
 *
 * Still here, and still the backstop rather than the plan: reversing gets the
 * car out of the ordinary wedge, and this covers the case where it does not —
 * a prop knocked into exactly the wrong place, a stop walled off by a board.
 * A tour that stalls forever is worse than one that skips a stop.
 */
const LEG_TIMEOUT = 26

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

let active = false
let index = 0
let holdRemaining = 0
let legElapsed = 0
let epochAtStart = 0

/** Whether the autopilot is heading for the waypoint or backing away from
 *  whatever is between it and the waypoint. */
let reversing = false
let reverseRemaining = 0
let reverseSide = 1
let stalledFor = 0
let closest = Infinity

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
  actions.down = false
  actions.left = false
  actions.right = false
  actions.boost = false
  actions.brake = false
}

/** Starts a leg: nothing known about it yet, and no reason to think it is
 *  going badly. */
function beginLeg() {
  legElapsed = 0
  reversing = false
  reverseRemaining = 0
  stalledFor = 0
  closest = Infinity
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
  beginLeg()
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

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
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
      beginLeg()
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

  if (reversing) {
    reverseRemaining -= deltaSeconds
    release()
    actions.down = true
    // Front wheels hard over. Reversing swings the nose the opposite way, so
    // the car comes off whatever it was against at an angle instead of backing
    // straight into it again on the next attempt.
    if (reverseSide > 0) actions.right = true
    else actions.left = true

    if (reverseRemaining <= 0) {
      reversing = false
      stalledFor = 0
      closest = Infinity
    }
    return
  }

  if (distance < closest - PROGRESS_EPSILON) {
    closest = distance
    stalledFor = 0
  } else if (car.speed < MOVING_SPEED) {
    stalledFor += deltaSeconds
  } else {
    stalledFor = 0
  }

  if (stalledFor > STALLED_AFTER) {
    reversing = true
    reverseRemaining = REVERSE_FOR
    reverseSide = -reverseSide
    release()
    return
  }

  // Three's ground plane to the simulation's, which is the flip `toCannonGround`
  // applies — the car compares this against its own `angle`, which lives in
  // that frame.
  joystick.angle = Math.atan2(-dz, dx)
  joystick.active = true
  actions.down = false
  actions.left = false
  actions.right = false

  const wanted = CRUISE * clamp(distance / APPROACH_WITHIN, APPROACH_FLOOR, 1)
  actions.up = car.speed <= wanted
  actions.brake = car.speed > wanted * OVERSPEED
  actions.boost = distance > BOOST_BEYOND
}
