import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { makeMatcap } from '../../lib/matcap'
import { colorAt, world, type PaletteName } from '../../lib/palette'
import { palette } from '../../lib/palette'
import { createClayMaterial } from './materials/clay'

/**
 * A material keyed to the palette. Callers pass either a palette name, an
 * index (reusing the same `index % colors.length` cycling the DOM components
 * use), or nothing at all for the default off-white body color.
 */
export function useClayMaterial(opts?: {
  color?: PaletteName
  index?: number
  clipBelowGround?: boolean
}) {
  const hex =
    opts?.color !== undefined
      ? palette[opts.color]
      : opts?.index !== undefined
        ? colorAt(opts.index)
        : world.bone

  const material = useMemo(
    () =>
      createClayMaterial({
        matcap: makeMatcap(hex),
        indirectColor: world.indirect,
        clipBelowGround: opts?.clipBelowGround ?? true,
      }),
    [hex, opts?.clipBelowGround]
  )

  useEffect(() => () => material.dispose(), [material])

  return material
}

/**
 * Overwrites every material on a loaded model with our clay material.
 *
 * This is what lets mismatched CC0 asset kits read as one coherent world — the
 * incoming materials are discarded wholesale, so nothing carries its original
 * kit's shading conventions in with it.
 */
export function useClayModel(
  scene: THREE.Object3D | undefined,
  material: THREE.Material
) {
  return useMemo(() => {
    if (!scene) return undefined
    const clone = scene.clone(true)
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (mesh.isMesh) {
        mesh.material = material
        mesh.castShadow = false
        mesh.receiveShadow = false
      }
    })
    return clone
  }, [scene, material])
}
