import { useEffect } from 'react'

/**
 * The scenery's collision volumes.
 *
 * folio does this the other way round: `Physics.addObjectFromThree()` walks a
 * loaded model's meshes and derives a body from each one. That works there
 * because its props arrive as authored GLBs with collision meshes baked in.
 * Here every prop is built from three primitives at render time, so the shape
 * a body should take is already known at the call site and there is nothing to
 * derive — each section declares its volumes and this module hands them to
 * whichever simulation is currently running.
 *
 * Volumes are declared in three's frame, in the same numbers as the meshes they
 * stand for. Conversion into the car's Z-up simulation happens once, in
 * `CarPhysics`, for the same reason `toThreeGround` exists: one boundary, not
 * one per caller.
 *
 * Everything registered here is static. Nothing in the world can be pushed, and
 * that is deliberate — a knockable prop that ends up wedged under the chassis
 * is a worse outcome than one you simply cannot drive through.
 */

export type Obstacle = {
  /** Ground position in three space, [x, z]. */
  position: [number, number]
  /** Centre of the volume above the floor. */
  y: number
  /** Yaw about three's +y — normally the yaw of the group the prop renders in. */
  yaw?: number
} & (
  | {
      kind: 'box'
      /** Half sizes along the prop's own x, y (height) and z. */
      halfExtents: [number, number, number]
    }
  | { kind: 'cylinder'; radius: number; height: number }
)

type Change = (obstacle: Obstacle, action: 'add' | 'remove') => void

const registered = new Set<Obstacle>()
const listeners = new Set<Change>()

/**
 * Registers volumes and returns a teardown.
 *
 * Identity is the key: the same object that went in has to come back out, which
 * is why callers hand over a memoised array rather than rebuilding it each
 * render.
 */
export function addObstacles(obstacles: readonly Obstacle[]): () => void {
  for (const obstacle of obstacles) {
    registered.add(obstacle)
    listeners.forEach((listener) => listener(obstacle, 'add'))
  }

  return () => {
    for (const obstacle of obstacles) {
      if (!registered.delete(obstacle)) continue
      listeners.forEach((listener) => listener(obstacle, 'remove'))
    }
  }
}

/**
 * Watches the registry, replaying everything already in it.
 *
 * The replay is what makes mount order irrelevant. The car and the scenery are
 * siblings in one tree and either may mount first; without it, a section that
 * rendered before the physics world would be quietly non-solid.
 */
export function subscribeObstacles(listener: Change): () => void {
  registered.forEach((obstacle) => listener(obstacle, 'add'))
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Registers a section's volumes for as long as it is mounted. */
export function useObstacles(obstacles: readonly Obstacle[]) {
  useEffect(() => addObstacles(obstacles), [obstacles])
}
