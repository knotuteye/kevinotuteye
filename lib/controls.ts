import type { CarActions, Joystick } from './car'
import { WORLD_YAW } from './world'

/**
 * Driving input, ported from folio-2019's `World/Controls.js` (MIT).
 *
 * Like the car state itself this is a plain mutable object read once per frame
 * inside the physics step, not React state — a re-render per keypress would be
 * both pointless and, at 60fps with a key held down, actively harmful.
 */

export const actions: CarActions = {
  up: false,
  right: false,
  down: false,
  left: false,
  brake: false,
  boost: false,
}

function clear() {
  actions.up = false
  actions.right = false
  actions.down = false
  actions.left = false
  actions.brake = false
  actions.boost = false
  joystick.active = false
}

/** True while the driver is actively asking the car to do something. */
export function isDriving(): boolean {
  return (
    actions.up || actions.down || actions.left || actions.right || joystick.active
  )
}

export type ControlEvent = 'reset' | 'horn' | 'sound'

const eventListeners = new Set<(event: ControlEvent) => void>()

function emit(event: ControlEvent) {
  eventListeners.forEach((listener) => listener(event))
}

/**
 * Raises a one-shot from outside the keyboard.
 *
 * The chrome is DOM and the car is inside the canvas, with no shared owner
 * between them; a button that wants to respawn the car has to say so the same
 * way the R key does rather than reach for the simulation.
 */
export function requestEvent(event: ControlEvent) {
  emit(event)
}

/**
 * Binds keyboard and touch input. Returns a teardown, and takes a callback for
 * the one-shot events — respawn, horn, mute — that are not held states.
 */
export function bindControls(onEvent: (event: ControlEvent) => void): () => void {
  eventListeners.add(onEvent)

  const onKeyDown = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        actions.up = true
        break
      case 'ArrowRight':
      case 'KeyD':
        actions.right = true
        break
      case 'ArrowDown':
      case 'KeyS':
        actions.down = true
        break
      case 'ArrowLeft':
      case 'KeyA':
        actions.left = true
        break
      case 'ControlLeft':
      case 'ControlRight':
      case 'Space':
        actions.brake = true
        break
      case 'ShiftLeft':
      case 'ShiftRight':
        actions.boost = true
        break
      // One-shots, on the press rather than the release: a horn that sounds
      // when you let go is a horn nobody trusts. `repeat` is what keeps a held
      // key from firing them at the keyboard's auto-repeat rate.
      case 'KeyR':
        if (!event.repeat) emit('reset')
        break
      case 'KeyH':
        if (!event.repeat) emit('horn')
        break
      case 'KeyM':
        if (!event.repeat) emit('sound')
        break
      default:
        return
    }

    // The canvas is a fixed viewport with a hidden DOM layer behind it, so the
    // arrow keys and space would otherwise scroll that layer under the world.
    event.preventDefault()
  }

  const onKeyUp = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        actions.up = false
        break
      case 'ArrowRight':
      case 'KeyD':
        actions.right = false
        break
      case 'ArrowDown':
      case 'KeyS':
        actions.down = false
        break
      case 'ArrowLeft':
      case 'KeyA':
        actions.left = false
        break
      case 'ControlLeft':
      case 'ControlRight':
      case 'Space':
        actions.brake = false
        break
      case 'ShiftLeft':
      case 'ShiftRight':
        actions.boost = false
        break
    }
  }

  // Alt-tabbing away with a key held leaves that key stuck down forever,
  // because the keyup lands on another window.
  const onVisibilityChange = () => {
    if (document.hidden) clear()
  }

  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('blur', clear)

  return () => {
    eventListeners.delete(onEvent)
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('keyup', onKeyUp)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('blur', clear)
    clear()
  }
}

/* ------------------------------------------------------------------ */
/* Touch                                                               */
/* ------------------------------------------------------------------ */

export function hasTouch(): boolean {
  return (
    typeof window !== 'undefined' &&
    (('ontouchstart' in window) || navigator.maxTouchPoints > 0)
  )
}

export type TouchAction = 'up' | 'down' | 'brake' | 'boost'

/** Presses an action for as long as a pointer is held on an element. */
export function bindTouchButton(
  element: HTMLElement,
  action: TouchAction
): () => void {
  const press = (event: PointerEvent) => {
    event.preventDefault()
    element.setPointerCapture(event.pointerId)
    actions[action] = true
  }

  const release = (event: PointerEvent) => {
    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId)
    }
    actions[action] = false
  }

  element.addEventListener('pointerdown', press)
  element.addEventListener('pointerup', release)
  element.addEventListener('pointercancel', release)

  return () => {
    element.removeEventListener('pointerdown', press)
    element.removeEventListener('pointerup', release)
    element.removeEventListener('pointercancel', release)
    actions[action] = false
  }
}

/* ------------------------------------------------------------------ */
/* Joystick                                                            */
/* ------------------------------------------------------------------ */

/**
 * folio's joystick, and the reason touch gets one rather than two thumb
 * buttons: it is an *absolute* control. The stick points at a spot on the
 * ground and the car goes there, so a driver aims where they want to be rather
 * than tapping left-left-left and reading the result. That is the difference
 * between steering a car and nudging one, and it is the whole feel of driving
 * the site on a phone.
 *
 * The mapping is what makes it work. A stick is pushed in *screen* directions,
 * but the car turns in world ones, and the camera is yawed by WORLD_YAW — so
 * "up" is not -z, it is up-the-screen. Getting this wrong is not subtly wrong:
 * the car sets off 38° from wherever the thumb is pointing.
 */
export const joystick: Joystick = { active: false, angle: 0 }

/** Below this the stick is at rest — a thumb resting on glass is not an input. */
const DEADZONE = 0.16
/** Full deflection is the boost, so there is no second button to reach for. */
const BOOST_AT = 0.94

function clearJoystick() {
  joystick.active = false
  actions.up = false
  actions.boost = false
}

/**
 * Screen offset (y down, as the DOM reports it) to a heading in the
 * simulation's frame.
 *
 * Screen right is the camera's right on the ground, (cos, -sin); screen up is
 * the direction away from the camera, (-sin, -cos). The last step is three's
 * ground plane to the simulation's, which is the same flip `toCannonGround`
 * applies.
 */
function headingFromScreen(dx: number, dy: number): number {
  const sin = Math.sin(WORLD_YAW)
  const cos = Math.cos(WORLD_YAW)
  const x = dx * cos + dy * sin
  const z = -dx * sin + dy * cos
  return Math.atan2(-z, x)
}

/**
 * Drives the joystick from a pointer held on `element`, measuring from that
 * element's centre. Reports the stick's offset within its radius so the UI can
 * draw the thing the thumb is holding.
 */
export function bindJoystick(
  element: HTMLElement,
  onMove: (x: number, y: number) => void
): () => void {
  let pointerId: number | null = null

  const update = (event: PointerEvent) => {
    const bounds = element.getBoundingClientRect()
    const radius = bounds.width * 0.5
    const dx = event.clientX - (bounds.left + radius)
    const dy = event.clientY - (bounds.top + radius)

    // Clamped to the pad, so the stick stops at its own edge instead of
    // following a thumb halfway across the screen.
    const length = Math.hypot(dx, dy)
    const scale = length > radius ? radius / length : 1
    onMove(dx * scale, dy * scale)

    const distance = Math.min(length / radius, 1)
    if (distance < DEADZONE) {
      clearJoystick()
      return
    }

    joystick.angle = headingFromScreen(dx, dy)
    joystick.active = true
    actions.up = true
    actions.boost = distance > BOOST_AT
  }

  const press = (event: PointerEvent) => {
    event.preventDefault()
    pointerId = event.pointerId
    // Capture, so a thumb that slides off the pad mid-corner keeps steering
    // instead of silently letting go.
    element.setPointerCapture(event.pointerId)
    update(event)
  }

  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return
    update(event)
  }

  const release = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return
    pointerId = null
    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId)
    }
    clearJoystick()
    onMove(0, 0)
  }

  element.addEventListener('pointerdown', press)
  element.addEventListener('pointermove', move)
  element.addEventListener('pointerup', release)
  element.addEventListener('pointercancel', release)

  return () => {
    element.removeEventListener('pointerdown', press)
    element.removeEventListener('pointermove', move)
    element.removeEventListener('pointerup', release)
    element.removeEventListener('pointercancel', release)
    clearJoystick()
  }
}
