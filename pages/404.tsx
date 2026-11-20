import { useCallback } from 'react'
import Cloth, { type FrameFn } from '../components/cloth/Cloth'
import Link from '../components/Link'
import { Reveal, Woven } from '../components/Reveal'
import Seo from '../components/Seo'
import { clothPatterns } from '../lib/content'
import { ENDS } from '../lib/kente'
import type { Page } from './_app'

/** One strip of the cloth has come loose and slipped away. */
const NotFound: Page = () => {
  const missing = 3
  const frame = useCallback<FrameFn>((p, ctx) => {
    const n = clothPatterns.length
    p.cam.scale = Math.max(ctx.width / (n * ENDS), ctx.height / 300)
    p.cam.x = (n * ENDS) / 2
    p.cam.y = ctx.time * 0.5
    p.dim = 0.5
    p.strips = clothPatterns.map((_, k) =>
      k === missing ? { slide: 0, top: 1e5, bottom: 1e5, warp: 0 } : { slide: 0, top: -1e5, bottom: 1e5, warp: 0 }
    )
    return true
  }, [])

  return (
    <>
      <Seo title="Not found" path="/404" noindex />
      <section className="relative flex min-h-[100svh] items-center overflow-hidden">
        <Cloth patterns={clothPatterns} frame={frame} className="absolute inset-0" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ground to-transparent" />
        <div className="gutter relative z-10 mx-auto w-full max-w-page">
          <div className="max-w-[760px] rounded-sm bg-ground/85 p-8 backdrop-blur-md md:p-12">
            <Reveal as="p" immediate className="t-label text-accent">
              404 · a dropped strip
            </Reveal>
            <Woven as="h1" immediate className="t-display mt-6 text-[clamp(72px,10vw,180px)]" lines={['Not on', [{ text: 'this cloth', italic: true, className: 'text-accent' }]]} />
            <Reveal as="p" immediate delay={300} className="t-lede mt-8 text-soft">
              This page isn&apos;t part of the weave. It may have moved, or never existed.
            </Reveal>
            <Reveal immediate delay={400} className="mt-10">
              <Link href="/" className="inline-flex min-h-[52px] items-center rounded-full bg-gold px-7 text-[16px] font-medium text-night transition-colors hover:bg-fg hover:text-ground">
                Back to the loom
              </Link>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}

export default NotFound
