/**
 * Converts a TTF into the "typeface.json" format three's FontLoader expects,
 * so <Text3D> can extrude real geometry from it.
 *
 * three ships a TTFLoader, but it hard-imports opentype.js from a CDN URL,
 * which is not usable in a bundle. This is the same conversion done once at
 * build time against a vendored font instead.
 *
 *   node scripts/ttf-to-typeface.mjs <in.ttf> <out.json>
 *
 * Outline token grammar (see three's FontLoader.createPath):
 *   m x y                       moveTo
 *   l x y                       lineTo
 *   q endX endY ctrlX ctrlY     quadratic  (end point FIRST)
 *   b endX endY c1x c1y c2x c2y cubic      (end point FIRST)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import opentype from 'opentype.js'

const [, , input, output] = process.argv
if (!input || !output) {
  console.error('usage: node scripts/ttf-to-typeface.mjs <in.ttf> <out.json>')
  process.exit(1)
}

// Only the characters the world actually renders. Shipping the full font as
// JSON would be several megabytes for no benefit.
const CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
  'abcdefghijklmnopqrstuvwxyz' +
  '0123456789' +
  " .,:;!?'\"()[]{}&@#%/\\|-–—_+=<>*^~`$"

const buffer = readFileSync(input)
const font = opentype.parse(
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
)

const resolution = font.unitsPerEm
const round = (n) => Math.round(n * 100) / 100

const glyphs = {}
let converted = 0
let missing = []

for (const char of new Set(CHARSET)) {
  const glyph = font.charToGlyph(char)
  if (!glyph || glyph.index === 0) {
    missing.push(char)
    continue
  }

  const path = glyph.getPath(0, 0, resolution)
  const tokens = []

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        tokens.push('m', round(cmd.x), round(-cmd.y))
        break
      case 'L':
        tokens.push('l', round(cmd.x), round(-cmd.y))
        break
      case 'Q':
        tokens.push('q', round(cmd.x), round(-cmd.y), round(cmd.x1), round(-cmd.y1))
        break
      case 'C':
        tokens.push(
          'b',
          round(cmd.x),
          round(-cmd.y),
          round(cmd.x1),
          round(-cmd.y1),
          round(cmd.x2),
          round(-cmd.y2)
        )
        break
      case 'Z':
      default:
        break
    }
  }

  const bbox = glyph.getBoundingBox()
  glyphs[char] = {
    ha: round(glyph.advanceWidth),
    x_min: round(bbox.x1 || 0),
    x_max: round(bbox.x2 || 0),
    o: tokens.join(' '),
  }
  converted++
}

// getPath(x, y, size) renders with y pointing down; we negated y above, so the
// vertical metrics need the same treatment to stay consistent.
const typeface = {
  glyphs,
  familyName: font.names.fontFamily?.en ?? 'Font',
  ascender: round(font.ascender),
  descender: round(font.descender),
  underlinePosition: round(font.tables.post?.underlinePosition ?? -100),
  underlineThickness: round(font.tables.post?.underlineThickness ?? 50),
  boundingBox: {
    xMin: round(font.tables.head.xMin),
    xMax: round(font.tables.head.xMax),
    yMin: round(font.tables.head.yMin),
    yMax: round(font.tables.head.yMax),
  },
  resolution,
  cssFontWeight: String(font.tables.os2?.usWeightClass ?? 'normal'),
  cssFontStyle: 'normal',
}

writeFileSync(output, JSON.stringify(typeface))

const bytes = readFileSync(output).length
console.log(
  `${converted} glyphs -> ${output} (${(bytes / 1024).toFixed(1)} KB, resolution ${resolution})`
)
if (missing.length) console.log(`missing: ${missing.join('')}`)
