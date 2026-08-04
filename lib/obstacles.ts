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
 * A volume with a `mass` is simulated rather than pinned, and the declared
 * position becomes a rest pose rather than a permanent one. Which props get one
 * is a judgement per prop, not a global switch: a rock that rolls when you clip
 * it is right, and a tree that tips over and stays down reads as a bug. So
 * scenery that is *rooted* stays static, and the things that exist to be
 * knocked about carry mass.
 *
 * The wedging problem this file used to warn about is handled two ways rather
 * than by refusing to move: damping high enough that props settle instead of
 * skating, and `reset` — which tears the bodies down and replays the registry,
 * so returning the car also puts every prop back where it started, for free.
 */

export type Obstacle = {
  /** Ground position in three space, [x, z]. */
  position: [number, number]
  /** Centre of the volume above the floor. */
  y: number
  /** Yaw about three's +y — normally the yaw of the group the prop renders in. */
  yaw?: number
  /**
   * Kilograms. Omitted or zero pins the volume in place.
   *
   * Worth calibrating against the chassis' 40kg: at 1-2kg a prop scatters, at
   * 8-15kg it shunts and topples, and much above that it barely notices a car.
   */
  mass?: number
} & (
  | {
      kind: 'box'
      /** Half sizes along the prop's own x, y (height) and z. */
      halfExtents: [number, number, number]
    }
  | { kind: 'cylinder'; radius: number; height: number }
  /**
   * The only shape here that exists for how it *moves* rather than for what it
   * fences off. A boulder wants to roll away when the car clips it, and a box
   * or a cylinder on its end will tip once and stop dead.
   */
  | { kind: 'sphere'; radius: number }
)

/* ------------------------------------------------------------------ */
/* Transform readback                                                  */
/* ------------------------------------------------------------------ */

/**
 * Where a simulated prop actually is, in three's frame, for the mesh that
 * stands for it.
 *
 * Plain numbers and a mutable object, for the same reason `CarState` is one:
 * this is written every step and read every frame inside `useFrame`, and a
 * re-render per prop per step would cost more than the physics.
 */
export type ObstacleTransform = {
  x: number
  y: number
  z: number
  qx: number
  qy: number
  qz: number
  qw: number
  /** False until the simulation has published a step for this body. */
  live: boolean
}

const transforms = new WeakMap<Obstacle, ObstacleTransform>()

/**
 * The channel between a volume and its mesh.
 *
 * Seeded from the declared rest pose rather than from zero, so a prop whose
 * mesh renders before the physics world exists — or one that never gets a body
 * at all, because the visitor is on the reduced-motion path — sits exactly
 * where its author put it instead of collapsing to the origin.
 */
export function getObstacleTransform(obstacle: Obstacle): ObstacleTransform {
  let transform = transforms.get(obstacle)
  if (transform) return transform

  const half = (obstacle.yaw ?? 0) / 2
  transform = {
    x: obstacle.position[0],
    y: obstacle.y,
    z: obstacle.position[1],
    qx: 0,
    qy: Math.sin(half),
    qz: 0,
    qw: Math.cos(half),
    live: false,
  }
  transforms.set(obstacle, transform)
  return transform
}

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
