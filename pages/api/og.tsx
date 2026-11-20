import type { NextApiRequest, NextApiResponse } from 'next'
import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { colors } from '../../Theme'
import { clothPatterns } from '../../lib/content'
import { compileCloth, ENDS, PATTERNS } from '../../lib/kente'

/**
 * The link preview card, drawn per route from the same pattern book as the
 * site's loom, so it cannot drift from it. `?title=` sets the eyebrow.
 *
 * The card renderer is not a browser and has no WebGL, so the cloth is drawn
 * as plain coloured cells.
 */

let fontsPromise: Promise<[Buffer, Buffer, Buffer]> | null = null

function fonts() {
  const dir = path.join(process.cwd(), 'public', 'fonts')
  fontsPromise ??= Promise.all([
    readFile(path.join(dir, 'instrument-serif-400.ttf')),
    readFile(path.join(dir, 'instrument-serif-400-italic.ttf')),
    readFile(path.join(dir, 'jetbrains-mono-400.ttf')),
  ])
  return fontsPromise
}

const STRIPS = 3
const COLS = 12
const WIDTH = 440
const HEIGHT = 630
const GAP = 4

/**
 * The last few strips of the cloth as rows of coloured cells, sampled from the
 * loom's far-view colour texture. Satori only lays out flexbox, so each strip
 * is a column of rows.
 */
const cloth = (() => {
  const ids = clothPatterns.slice(-STRIPS)
  const compiled = compileCloth(ids.map((id) => PATTERNS[id]))
  const stripW = (WIDTH - GAP * (STRIPS - 1)) / STRIPS
  const cell = stripW / COLS
  const rows = Math.ceil(HEIGHT / cell)
  const step = ENDS / COLS
  return Array.from({ length: STRIPS }, (_, s) =>
    Array.from({ length: rows }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => {
        const o = ((r * step) % compiled.height) * compiled.width * 4 + (s * ENDS + c * step + 1) * 4
        return `rgb(${compiled.colour[o]},${compiled.colour[o + 1]},${compiled.colour[o + 2]})`
      })
    )
  )
})()

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  const raw = request.query.title
  const title = (typeof raw === 'string' ? raw : '').slice(0, 60)
  const [serif, serifItalic, mono] = await fonts()

  const image = new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: colors.ink, color: colors.cotton }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '60px 64px',
          }}
        >
          <div style={{ display: 'flex', fontFamily: 'Mono', fontSize: 20, letterSpacing: 3, color: colors.gold }}>
            {title ? title.toUpperCase() : 'AI + HEALTH TECH ENGINEER · ACCRA'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'Serif', fontSize: 168, lineHeight: 0.86, letterSpacing: -4 }}>
            <div style={{ display: 'flex' }}>Kevin</div>
            <div style={{ display: 'flex', fontStyle: 'italic', color: colors.gold }}>Otuteye</div>
          </div>
          <div style={{ display: 'flex', fontFamily: 'Mono', fontSize: 18, letterSpacing: 2, color: colors.muted }}>
            SOFTWARE, WOVEN STRIP BY STRIP
          </div>
        </div>
        <div style={{ display: 'flex', width: WIDTH, height: HEIGHT, gap: GAP, overflow: 'hidden' }}>
          {cloth.map((strip, s) => (
            <div key={s} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {strip.map((row, r) => (
                <div key={r} style={{ display: 'flex', flexShrink: 0 }}>
                  {row.map((fill, c) => (
                    <div key={c} style={{ flex: 1, height: (WIDTH - GAP * (STRIPS - 1)) / STRIPS / COLS, background: fill }} />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Serif', data: serif, style: 'normal', weight: 400 },
        { name: 'Serif', data: serifItalic, style: 'italic', weight: 400 },
        { name: 'Mono', data: mono, style: 'normal', weight: 400 },
      ],
    }
  )

  const body = Buffer.from(await image.arrayBuffer())
  response.setHeader('Content-Type', 'image/png')
  // Crawlers refetch these constantly and the card only changes with the code.
  response.setHeader('Cache-Control', 'public, immutable, no-transform, max-age=31536000')
  response.status(200).send(body)
}
