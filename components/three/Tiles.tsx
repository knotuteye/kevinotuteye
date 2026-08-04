import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mulberry32, range } from '../../lib/rng'
import { INTRO_SPAWN, ZONE_LIST } from '../../lib/world'
import { useClayMaterial } from './Clay'

/**
 * Paving slabs laid along every route out of the intro.
 *
 * Ported from folio's `Tiles.js`, and it does two jobs there that this site was
 * missing both of. The obvious one is wayfinding: a trail leaving the name is a
 * road, and a road is an invitation to follow it, which no amount of signage
 * quite achieves. The quieter one is that they give the floor a scale. A flat
 * gradient with three objects on it has no way of telling you whether the next
 * marker is thirty metres away or three hundred; a run of slabs at a known
 * spacing answers that continuously, the whole way there.
 *
 * The scatter is folio's, near enough verbatim: a fixed inter-tile distance
 * with jitter on position and rotation, plus a quarter-turn index that cycles
 * so repeats of the same slab do not line up.
 */

/** folio's numbers, in metres. */
const INTER_DISTANCE = 1.5
const TANGENT_DISTANCE = 0.3
const POSITION_RANDOMNESS = 0.3
const ROTATION_RANDOMNESS = 0.1

const TILE = { size: 0.95, thickness: 0.07 }

/**
 * Slabs never sit on the lettering.
 *
 * Every route out of the spawn heads roughly past the name, and the run to
 * About goes straight over it — a trail of paving through the middle of
 * "KEVIN OTUTEYE" makes both unreadable. Tested as a radius about the origin
 * rather than a box because the name is yawed and a keep-out that had to be
 * yawed with it is a second thing to keep in sync.
 */
const NAME_CLEARANCE = 13

type Tile = { x: number; z: number; yaw: number; accent: boolean }

/**
 * One route's worth of slabs.
 *
 * The tangent offset alternates side to side each step, which is what stops the
 * run reading as a drawn line and starts it reading as something laid by hand.
 */
function tilePath(
  from: [number, number],
  to: [number, number],
  rand: () => number,
  skipEnd: number
): Tile[] {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const distance = Math.hypot(dx, dz)
  const count = Math.floor(distance / INTER_DISTANCE)
  if (count <= 0) return []

  const dirX = dx / distance
  const dirZ = dz / distance
  // Perpendicular in the ground plane.
  const tanX = -dirZ * TANGENT_DISTANCE
  const tanZ = dirX * TANGENT_DISTANCE
  const angle = Math.atan2(dirX, dirZ)

  const tiles: Tile[] = []

  for (let i = 0; i < count; i++) {
    const along = i * INTER_DISTANCE
    // Stop short of the marker, so the trail arrives at the gate rather than
    // paving the zone's own floor.
    if (distance - along < skipEnd) continue

    const side = i % 2 === 0 ? 1 : -1
    const x =
      from[0] + dirX * along + tanX * side + (rand() - 0.5) * POSITION_RANDOMNESS
    const z =
      from[1] + dirZ * along + tanZ * side + (rand() - 0.5) * POSITION_RANDOMNESS

    if (Math.hypot(x, z) < NAME_CLEARANCE) continue

    tiles.push({
      x,
      z,
      // Quarter turns cycle so identical slabs never repeat their orientation.
      yaw: angle + (rand() - 0.5) * ROTATION_RANDOMNESS + (i % 4) * Math.PI * 0.5,
      // A scattering of colour, at folio's kind of ratio — enough to break the
      // run up, rare enough that it never becomes a pattern.
      accent: rand() > 0.82,
    })
  }

  return tiles
}

/**
 * Bakes a set of slabs into one geometry.
 *
 * Not an `InstancedMesh`, and that is not an oversight. The clay material
 * rewrites `#include <project_vertex>` wholesale to do the reveal displacement
 * in world space, and three's instancing happens to live inside that same
 * chunk — so instancing a clay material silently drops the `instanceMatrix`
 * multiply and stacks every slab at the origin. Merging is one draw call
 * either way for geometry that never moves, and it sidesteps the trap.
 */
function bake(tiles: Tile[]): THREE.BufferGeometry | null {
  if (tiles.length === 0) return null

  const matrix = new THREE.Matrix4()
  const quaternion = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  const one = new THREE.Vector3(1, 1, 1)

  const parts = tiles.map((tile) => {
    const geometry = new THREE.BoxGeometry(
      TILE.size,
      TILE.thickness,
      TILE.size
    )
    quaternion.setFromAxisAngle(up, tile.yaw)
    matrix.compose(
      // Half-sunk, so the slab reads as set into the ground rather than
      // dropped on top of it.
      new THREE.Vector3(tile.x, TILE.thickness * 0.25, tile.z),
      quaternion,
      one
    )
    geometry.applyMatrix4(matrix)
    return geometry
  })

  const merged = mergeGeometries(parts)
  parts.forEach((part) => part.dispose())
  return merged
}

export default function Tiles() {
  const base = useClayMaterial()
  const accent = useClayMaterial({ color: 'maizeCrayola' })

  const { baseGeometry, accentGeometry } = useMemo(() => {
    const rand = mulberry32(7)
    const all: Tile[] = []

    for (const zone of ZONE_LIST) {
      if (zone.id === 'intro') continue
      all.push(
        ...tilePath(
          INTRO_SPAWN,
          zone.position,
          rand,
          // Clear of the marker rectangle plus a little breathing room.
          zone.halfExtents[1] + range(rand, 2, 4)
        )
      )
    }

    return {
      baseGeometry: bake(all.filter((t) => !t.accent)),
      accentGeometry: bake(all.filter((t) => t.accent)),
    }
  }, [])

  useEffect(
    () => () => {
      baseGeometry?.dispose()
      accentGeometry?.dispose()
    },
    [baseGeometry, accentGeometry]
  )

  return (
    <>
      {/* No colliders. They are seventy millimetres proud of a floor the car
          is already resting on, so a body per slab would buy a hundred-odd
          contacts and a rumble strip. */}
      {baseGeometry ? (
        <mesh geometry={baseGeometry} material={base} />
      ) : null}
      {accentGeometry ? (
        <mesh geometry={accentGeometry} material={accent} />
      ) : null}
    </>
  )
}
