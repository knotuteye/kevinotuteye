import { useEffect, useSyncExternalStore } from 'react'

/**
 * The world's one interaction verb.
 *
 * Everything else here is a fact you arrive at: drive into a region and the URL
 * changes, pull up to a board and it opens. That is enough for reading and it
 * is not enough for *acting* — a project you cannot visit and an address you
 * cannot mail are decoration, and a portfolio whose whole job is to be acted on
 * cannot end at "look".
 *
 * So there is exactly one verb, and it works the same everywhere: whatever you
 * are parked at is what it opens. Sections publish a target while the car is
 * near one of their items; the chrome names it; E, or a tap on the prompt,
 * fires it. Adding a fourth openable thing later means publishing from a fourth
 * place and nothing else.
 *
 * Deliberately not a raycast against clickable meshes. Clicking would be a
 * second input scheme layered over driving, with its own hover states and its
 * own answer to "what does a tap on the canvas mean" — and the answer on touch,
 * where a tap is already how you place the joystick, is "nothing good".
 */

export type Interaction = {
  /** Named for what opening it does — "Open on GitHub", not "GitHub". */
  label: string
  href: string
}

/**
 * Keyed by section rather than held as a single value.
 *
 * Zone regions do not overlap, so in practice at most one section ever has a
 * live target. The key is what makes that a property of the layout rather than
 * something the last writer decides: a section that drops its target cannot
 * clear another section's, and a section unmounting cleans up only after
 * itself.
 */
const owners = new Map<string, Interaction>()
let current: Interaction | null = null
const listeners = new Set<() => void>()

function resolve(): Interaction | null {
  let last: Interaction | null = null
  for (const value of owners.values()) last = value
  return last
}

export function getInteraction(): Interaction | null {
  return current
}

export function setInteraction(owner: string, value: Interaction | null) {
  const existing = owners.get(owner)

  if (value === null) {
    if (!owners.delete(owner)) return
  } else {
    if (existing?.href === value.href && existing.label === value.label) return
    owners.set(owner, value)
  }

  const next = resolve()
  // Compared by content, not identity: sections rebuild their target object on
  // every render, and an identity check would publish a change per frame.
  if (next?.href === current?.href && next?.label === current?.label) return

  current = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** For the DOM chrome, which has to re-render to name the target. */
export function useInteraction(): Interaction | null {
  return useSyncExternalStore(subscribe, getInteraction, () => null)
}

/**
 * Publishes a section's target for as long as it has one.
 *
 * The cleanup is the reason this is a hook rather than a bare call: a section
 * that unmounts mid-approach — which is every section, on a route change —
 * would otherwise leave the prompt naming something no longer in the world.
 */
export function usePublishInteraction(
  owner: string,
  value: Interaction | null
) {
  const label = value?.label ?? null
  const href = value?.href ?? null

  useEffect(() => {
    setInteraction(owner, label && href ? { label, href } : null)
  }, [owner, label, href])

  useEffect(() => () => setInteraction(owner, null), [owner])
}

/**
 * Opens whatever is currently published.
 *
 * `mailto:` goes through `location` rather than `window.open`, which on most
 * browsers opens a blank tab beside the mail client and leaves it there.
 */
export function openInteraction(): boolean {
  if (typeof window === 'undefined' || !current) return false

  if (current.href.startsWith('mailto:')) {
    window.location.href = current.href
    return true
  }

  window.open(current.href, '_blank', 'noopener,noreferrer')
  return true
}
