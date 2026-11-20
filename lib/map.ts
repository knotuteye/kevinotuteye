import map from './map.json'

/**
 * The world as a grid of land cells on an Equal Earth map centred on 100°W,
 * built by scripts/make-map.mjs from Natural Earth (public domain).
 */

const A1 = 1.340264
const A2 = -0.081106
const A3 = 0.000893
const A4 = 0.003796
const M = Math.sqrt(3) / 2
const XMAX = 2.70644
const YMAX = 1.31735

export const MAP = { cols: map.cols, rows: map.rows, aspect: XMAX / YMAX }

/** Longitude and latitude to 0..1 across and down the sheet. */
export function project(lon: number, lat: number): [number, number] {
  let l = lon - map.lon0
  if (l < -180) l += 360
  if (l > 180) l -= 360
  const lam = (l * Math.PI) / 180
  const phi = (lat * Math.PI) / 180
  const t = Math.asin(M * Math.sin(phi))
  const t2 = t * t
  const t6 = t2 * t2 * t2
  const x = (lam * Math.cos(t)) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)))
  const y = t * (A1 + A2 * t2 + t6 * (A3 + A4 * t2))
  return [(x + XMAX) / (2 * XMAX), (YMAX - y) / (2 * YMAX)]
}

let decoded: Uint8Array | null = null

/** True when the cell at column c, row r is land. */
export function isLand(c: number, r: number): boolean {
  if (!decoded) {
    const raw = atob(map.bits)
    decoded = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) decoded[i] = raw.charCodeAt(i)
  }
  const k = r * map.cols + c
  return ((decoded[k >> 3] >> (k & 7)) & 1) === 1
}
