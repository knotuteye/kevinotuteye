import * as THREE from 'three'
import { palette, world, type PaletteName } from './palette'

/**
 * Generates matcap textures at runtime instead of shipping PNGs.
 *
 * A matcap is a sphere pre-lit from a fixed direction; sampling it by view-space
 * normal replaces an entire lighting rig. The clay look we want is entirely
 * about what we leave out — no specular lobe, no rim light, a wide soft
 * terminator, and a single warm bounce from below tinted with `world.indirect`,
 * the same value used for every shadow in the scene.
 *
 * Because these are derived from Theme.js, changing a hex reskins the world.
 */

const SIZE = 128

// Key light: upper-left, angled toward the viewer. Matches the reference's
// matcaps and, more importantly, the direction the fake shadows are cast from.
const KEY = new THREE.Vector3(-0.45, 0.65, 0.62).normalize()
// Bounce: up from the floor, so downward-facing surfaces pick up ground color.
const BOUNCE = new THREE.Vector3(0.15, -0.9, 0.4).normalize()

const AMBIENT = 0.42
const KEY_STRENGTH = 0.72
const BOUNCE_STRENGTH = 0.38
const EDGE_DARKEN = 0.12

const cache = new Map<string, THREE.Texture>()

/** Builds one matte-clay matcap for a base color. Cached by hex. */
export function makeMatcap(hex: string): THREE.Texture {
  const cached = cache.get(hex)
  if (cached) return cached

  const base = new THREE.Color(hex)
  const indirect = new THREE.Color(world.indirect)

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(SIZE, SIZE)
  const data = image.data

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // Map pixel to the unit sphere, +y up.
      let nx = (x / (SIZE - 1)) * 2 - 1
      let ny = 1 - (y / (SIZE - 1)) * 2

      let r2 = nx * nx + ny * ny
      if (r2 > 1) {
        // Outside the sphere: clamp onto the silhouette so the edge stays
        // continuous rather than showing background through the seam.
        const inv = 1 / Math.sqrt(r2)
        nx *= inv
        ny *= inv
        r2 = 1
      }
      const nz = Math.sqrt(Math.max(0, 1 - r2))

      const nl = nx * KEY.x + ny * KEY.y + nz * KEY.z
      // Half-lambert: no hard terminator, which is what reads as soft clay.
      const key = Math.pow(Math.min(1, Math.max(0, nl * 0.5 + 0.5)), 1.35)

      const nb = nx * BOUNCE.x + ny * BOUNCE.y + nz * BOUNCE.z
      const bounce = Math.pow(Math.min(1, Math.max(0, nb)), 1.6)

      // Slight darkening toward the silhouette gives the form some volume
      // without introducing a specular highlight.
      const edge = 1 - Math.pow(1 - nz, 3) * EDGE_DARKEN

      const lit = AMBIENT + key * KEY_STRENGTH
      const r = (base.r * lit + indirect.r * bounce * BOUNCE_STRENGTH) * edge
      const g = (base.g * lit + indirect.g * bounce * BOUNCE_STRENGTH) * edge
      const b = (base.b * lit + indirect.b * bounce * BOUNCE_STRENGTH) * edge

      const i = (y * SIZE + x) * 4
      data[i] = Math.min(255, r * 255)
      data[i + 1] = Math.min(255, g * 255)
      data[i + 2] = Math.min(255, b * 255)
      data[i + 3] = 255
    }
  }

  ctx.putImageData(image, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  cache.set(hex, texture)
  return texture
}

/** Matcap for a named palette entry. */
export function matcapFor(name: PaletteName): THREE.Texture {
  return makeMatcap(palette[name])
}

/** The default off-white body color for most world geometry. */
export function boneMatcap(): THREE.Texture {
  return makeMatcap(world.bone)
}

export function disposeMatcaps() {
  cache.forEach((t) => t.dispose())
  cache.clear()
}
