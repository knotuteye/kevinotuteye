/**
 * Builds lib/map.json: the land, as a grid of bits on an Equal Earth map.
 *
 *   node scripts/make-map.mjs path/to/ne_110m_land.geojson
 *
 * Land shapes are Natural Earth's 1:110m set (public domain), from
 * https://github.com/nvkelso/natural-earth-vector. The map is centred on
 * 100°W so that every city on the route, Auckland to Kumasi, sits on one sheet
 * without wrapping. lib/map.ts projects points with the same constants.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const [, , input] = process.argv
if (!input) throw new Error('usage: node scripts/make-map.mjs land.geojson')

const LON0 = -100
const COLS = 240
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796
const M = Math.sqrt(3) / 2
const XMAX = 2.70644, YMAX = 1.31735
const ROWS = Math.round((COLS * YMAX) / XMAX)
const SOUTH = -57

function inverse(x, y) {
  let t = y
  for (let k = 0; k < 12; k++) {
    const t2 = t * t, t6 = t2 * t2 * t2
    const f = t * (A1 + A2 * t2 + t6 * (A3 + A4 * t2)) - y
    const fp = A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)
    t -= f / fp
  }
  const t2 = t * t, t6 = t2 * t2 * t2
  const lon = (M * x * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2))) / Math.cos(t)
  const lat = Math.asin(Math.sin(t) / M)
  return [(lon * 180) / Math.PI, (lat * 180) / Math.PI]
}

const land = JSON.parse(readFileSync(input, 'utf8'))
const rings = []
for (const f of land.features) {
  const g = f.geometry
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
  for (const poly of polys) rings.push(poly[0])
}

function inside(lon, lat) {
  let hit = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j]
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit
    }
  }
  return hit
}

const bits = new Uint8Array(Math.ceil((COLS * ROWS) / 8))
let count = 0
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const x = ((c + 0.5) / COLS) * 2 * XMAX - XMAX
    const y = YMAX - ((r + 0.5) / ROWS) * 2 * YMAX
    const [dlon, lat] = inverse(x, y)
    if (Math.abs(dlon) > 180 || lat < SOUTH) continue
    let lon = dlon + LON0
    if (lon < -180) lon += 360
    if (lon > 180) lon -= 360
    if (inside(lon, lat)) {
      const k = r * COLS + c
      bits[k >> 3] |= 1 << (k & 7)
      count++
    }
  }
}

writeFileSync(
  new URL('../lib/map.json', import.meta.url),
  JSON.stringify({ lon0: LON0, cols: COLS, rows: ROWS, south: SOUTH, bits: Buffer.from(bits).toString('base64') }) + '\n'
)
console.log(`${count} land cells on a ${COLS} x ${ROWS} grid`)
