import type { NextApiRequest, NextApiResponse } from 'next'
import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { colors } from '../../Theme'
import { cellThread, stripWarmth, THREADS, weaveModel } from '../../lib/weave'

/**
 * The link preview card, drawn per route from the same tokens and weave model
 * as the site, so it can never drift from it. `?title=` sets the eyebrow.
 *
 * The weave here is simplified to solid blocks: the card renderer (Satori) is
 * not a browser, and pinstripes at this size would only shimmer in a feed.
 */

let fontsPromise: Promise<[Buffer, Buffer]> | null = null

function fonts() {
  const dir = path.join(process.cwd(), 'public', 'fonts')
  fontsPromise ??= Promise.all([
    readFile(path.join(dir, 'archivo-condensed-800.ttf')),
    readFile(path.join(dir, 'jetbrains-mono-400.ttf')),
  ])
  return fontsPromise
}

const STRIPS = 6
const UNIT = 42
const cloth = weaveModel(STRIPS, 12, 11)

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  const raw = request.query.title
  const title = (typeof raw === 'string' ? raw : '').slice(0, 60)
  const [archivo, mono] = await fonts()

  const image = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: colors.ink,
          color: colors.cotton,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '64px 72px',
          }}
        >
          <div style={{ display: 'flex', fontFamily: 'Mono', fontSize: 22, letterSpacing: 3, color: colors.gold }}>
            {title ? title.toUpperCase() : 'SENIOR FULL-STACK SOFTWARE ENGINEER'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'Archivo', fontSize: 184, lineHeight: 0.84 }}>
            <div style={{ display: 'flex' }}>KEVIN</div>
            <div style={{ display: 'flex' }}>OTUTEYE</div>
          </div>
          <div style={{ display: 'flex', fontFamily: 'Mono', fontSize: 20, letterSpacing: 2, color: colors.muted }}>
            KUMASI → BOSTON
          </div>
        </div>

        <div style={{ display: 'flex', width: 380, height: '100%', overflow: 'hidden', gap: 3 }}>
          {cloth.map((strip, i) => (
            <div
              key={i}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, marginTop: i % 2 ? -UNIT : 0 }}
            >
              {strip.map((cell, j) => (
                <div
                  key={j}
                  style={{
                    height: cell.units * UNIT,
                    flexShrink: 0,
                    background: THREADS[cellThread(cell, stripWarmth(i, STRIPS, 0, 1))],
                    borderBottom: `3px solid ${colors.ink}`,
                  }}
                />
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
        { name: 'Archivo', data: archivo, style: 'normal', weight: 800 },
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
