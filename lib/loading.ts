import { useSyncExternalStore } from 'react'

/**
 * When the world is allowed to start.
 *
 * Loading and revealing used to be the same event: `Reveal` ran its tween on
 * mount, and because it mounts inside the canvas' Suspense boundary, "mounted"
 * did roughly mean "assets are in". Roughly was the problem. The three seconds
 * of world growing out of the floor is the best thing on the site and it was
 * playing underneath a blank orange screen, finishing at about the moment the
 * loading overlay would have got out of the way.
 *
 * So the two are separated. Suspense still decides when the scene can be built;
 * this decides when it is allowed to be *seen*, and the overlay owns it — the
 * reveal starts as the curtain lifts rather than behind it.
 */

let ready = false
const listeners = new Set<() => void>()

export function isWorldReady(): boolean {
  return ready
}

/** Called by the loading overlay once it has begun to clear. */
export function setWorldReady() {
  if (ready) return
  ready = true
  listeners.forEach((listener) => listener())
}

export function subscribeWorldReady(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useWorldReady(): boolean {
  return useSyncExternalStore(subscribeWorldReady, isWorldReady, () => false)
}

/**
 * Deliberately not reset between routes.
 *
 * A route change remounts the entire canvas — see the note in `World` — so a
 * per-mount flag would put the loading screen back up on every navigation, for
 * assets that are already in memory. The curtain is for arriving at the site,
 * not for moving around inside it.
 */
