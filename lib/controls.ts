import type { CarActions } from './car'

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
}

/** True while the driver is actively asking the car to do something. */
export function isDriving(): boolean {
  return actions.up || actions.down || actions.left || actions.right
}

export type ControlEvent = 'reset'

/**
 * Binds keyboard and touch input. Returns a teardown, and takes a callback for
 * the one-shot events (currently only R to respawn) that are not held states.
 */
export function bindControls(onEvent: (event: ControlEvent) => void): () => void {
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
      case 'KeyR':
        onEvent('reset')
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

/**
 * Steering is the only axis a touch driver gets. folio uses a full joystick
 * that steers toward an absolute heading; that needs the car's own angle fed
 * back in, and on a site whose content all lies along one corridor it buys very
 * little over two thumb buttons.
 */
export function hasTouch(): boolean {
  return (
    typeof window !== 'undefined' &&
    (('ontouchstart' in window) || navigator.maxTouchPoints > 0)
  )
}

export type TouchAction = 'up' | 'down' | 'left' | 'right' | 'brake'

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
