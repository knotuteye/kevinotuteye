import type { NextApiRequest, NextApiResponse } from 'next'
import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * The link preview card.
 *
 * The site declared `twitter:card = summary_large_image` and never set an
 * `og:image`, which meant every share of it — in a DM, in Slack, on LinkedIn —
 * rendered as an empty box with a URL under it. For a portfolio whose entire
 * argument is "look at this", the preview is the first thing anyone sees and it
 * was the one surface showing nothing at all.
 *
 * Generated rather than checked in as a PNG, because a static card is a second
 * copy of the site's palette and wordmark that nobody remembers to re-export.
 * This one is drawn from the same hexes as `Theme.js` and takes the page title
 * as a parameter, so every route gets its own card and none of them can drift.
 *
 * Deliberately on the Node runtime rather than the Edge one this was first
 * written against: Next 16 deprecates Edge, and the only thing it was buying
 * here was a `Response` return instead of four lines of piping.
 */

/** From Theme.js — the floor gradient's own corners. */
const ORANGE_RED = '#f3722c'
const YELLOW_ORANGE = '#f8961e'
const MAIZE = '#f9c74f'
const RED_SALSA = '#f94144'
const BONE = '#f4efe6'

/**
 * The site's heading face, read once for the life of the server process.
 *
 * A module-level promise rather than a read per request: the file never
 * changes, and a card that is otherwise pure computation should not go to disk
 * every time somebody pastes a link.
 */
let fontPromise: Promise<Buffer> | null = null

function montserrat(): Promise<Buffer> {
  fontPromise ??= readFile(
    path.join(process.cwd(), 'public', 'fonts', 'montserrat-700.ttf')
  )
  return fontPromise
}

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const raw = request.query.title
  const title = (typeof raw === 'string' ? raw : '').slice(0, 60)

  const image = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          fontFamily: 'Montserrat',
          // The floor, near enough: the same corners the DataTexture in
          // `Floor.tsx` stretches across the viewport.
          backgroundImage: `linear-gradient(135deg, ${ORANGE_RED} 0%, ${YELLOW_ORANGE} 55%, ${MAIZE} 100%)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            letterSpacing: 14,
            color: 'rgba(255,255,255,0.75)',
          }}
        >
          {title ? title.toUpperCase() : 'PORTFOLIO'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 128,
              lineHeight: 1,
              color: BONE,
              letterSpacing: -4,
            }}
          >
            KEVIN
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 128,
              lineHeight: 1,
              color: RED_SALSA,
              letterSpacing: -4,
            }}
          >
            OTUTEYE
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{ display: 'flex', fontSize: 28, letterSpacing: 10, color: '#ffffff' }}
          >
            FULL STACK · MUSIC
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              letterSpacing: 6,
              color: 'rgba(255,255,255,0.85)',
              border: '2px solid rgba(255,255,255,0.6)',
              borderRadius: 999,
              padding: '12px 28px',
            }}
          >
            DRIVE IT
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Montserrat',
          data: await montserrat(),
          style: 'normal',
          weight: 700,
        },
      ],
    }
  )

  const body = Buffer.from(await image.arrayBuffer())

  response.setHeader('Content-Type', 'image/png')
  // Crawlers refetch these constantly and the card only changes when the code
  // does, so it is safe to let them hold onto it.
  response.setHeader(
    'Cache-Control',
    'public, immutable, no-transform, max-age=31536000'
  )
  response.status(200).send(body)
}
