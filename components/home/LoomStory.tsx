import { useCallback, useRef } from 'react'
import { chapters, clothPatterns, shortDate } from '../../lib/content'
import { ENDS } from '../../lib/kente'
import { clamp, easeInOut, easeOut, lerp, range, useReducedMotion } from '../../lib/motion'
import { clack, swish } from '../../lib/sound'
import Cloth, { type FrameFn } from '../cloth/Cloth'
import ClothFallback from '../cloth/Fallback'
import Link from '../Link'
import { Arrow, Reveal, Woven } from '../Reveal'

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

/** How far the section scrolls while the stage is pinned, in viewport heights. */
const PIN = 5.2
const SEAM = 6

/**
 * The opening of the site, one pinned canvas.
 *
 * It starts close on the current chapter's strip, still on the loom: bare warp
 * above, cloth below, the shuttle laying one pick at a time. The name is woven
 * into it, the first line behind the warp and the second over the cloth.
 * Scrolling pulls back: the seven finished strips arrive, newest first, as if
 * going back in time; then they are sewn edge to edge into one cloth, with the
 * last strip still being woven.
 */
export default function LoomStory() {
  const section = useRef<HTMLElement>(null)
  const heroOver = useRef<HTMLDivElement>(null)
  const captions = useRef<(HTMLDivElement | null)[]>([])
  const labels = useRef<(HTMLLIElement | null)[]>([])
  const finale = useRef<HTMLDivElement>(null)
  const counter = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const weave = useRef({ picks: 0, lastScroll: 0, boost: 0, lastPick: -1 })

  const n = clothPatterns.length
  const current = chapters[n - 1]

  const frame = useCallback<FrameFn>(
    (p, ctx) => {
      const el = section.current
      if (!el) return true
      const { width: W, height: H } = ctx
      const rect = el.getBoundingClientRect()
      const P = ctx.reduced ? 0 : clamp(-rect.top / Math.max(1, rect.height - window.innerHeight))

      // Weaving: steady, and faster while the visitor scrolls the hero.
      const w = weave.current
      const scrollY = window.scrollY
      w.boost = Math.max(w.boost * Math.pow(0.04, ctx.dt), Math.min(6, Math.abs(scrollY - w.lastScroll) * 0.06))
      w.lastScroll = scrollY
      if (!ctx.reduced) w.picks += ctx.dt * (1.15 + w.boost * (1 - range(P, 0.2, 0.5)))
      const pick = Math.floor(w.picks + 0.1)
      const phase = w.picks - Math.floor(w.picks)
      if (pick !== w.lastPick) {
        if (w.lastPick >= 0 && P < 0.7) {
          clack(1 - P)
          setTimeout(() => swish(0.45 * (1 - P)), 140)
        }
        w.lastPick = pick
        if (counter.current) counter.current.textContent = pad(pick, 4)
      }

      // Camera: from the strip on the loom to the whole cloth, zooming in log space.
      const narrow = W < 768
      const heroScale = (narrow ? W * 0.56 : clamp(W * 0.27, 280, 460)) / ENDS
      const clothWidth = (seam: number) => n * ENDS + (n - 1) * seam
      const fitScale = Math.min((W * (narrow ? 0.94 : 0.84)) / clothWidth(SEAM), (H * 0.9) / 260)
      const zoom = easeInOut(range(P, 0.04, 0.46))
      const push = easeInOut(range(P, 0.66, 1))
      const seam = lerp(SEAM, 0, easeInOut(range(P, 0.48, 0.64)))
      let scale = Math.exp(lerp(Math.log(heroScale), Math.log(fitScale), zoom))
      scale *= lerp(1, narrow ? 2.2 : 1.45, push)
      const lastX = (n - 1) * (ENDS + seam) + ENDS / 2
      p.seam = seam
      p.cam.scale = scale
      // In the hero the strip stands right of the introduction (or under it on
      // a phone); the offset unwinds as the camera pulls back.
      const heroShift = narrow ? 0 : (W * 0.22) / scale
      p.cam.x = lerp(lastX - heroShift, clothWidth(seam) / 2, zoom)
      const fellAt = lerp(narrow ? 0.86 : 0.44, 0.3, zoom) - push * 0.22
      p.cam.y = (0.5 - fellAt) * (H / scale)
      p.tilt = lerp(0, -0.06, push)
      p.dim = lerp(1, 0.5, push)
      p.drape = lerp(0.5, 1.1, zoom)

      // Strips. World y = 0 is the top of the cloth; the last strip's fell sits
      // there too, and its woven cloth flows down as picks are added.
      const length = (H / fitScale) * 1.2 + 80
      const above = (H / fitScale) * 0.3 + length + 40
      const below = (H / fitScale) * 0.7 + 40
      p.strips = clothPatterns.map((_, k) => {
        if (k === n - 1) {
          const woven = Math.floor(w.picks + 0.1)
          return { slide: w.picks, top: -woven, bottom: length - w.picks, warp: (H * (narrow ? 0.14 : 0.3)) / scale }
        }
        const order = n - 2 - k // newest first
        const a = easeOut(range(P, 0.08 + order * 0.04, 0.2 + order * 0.04))
        const from = k % 2 ? -above : below
        return { slide: lerp(from, 0, a), top: 0, bottom: length, warp: 0 }
      })

      // The shuttle crosses in the first 70% of a pick; the beater swings in after.
      const f = phase
      p.shuttle = { x: clamp(f / 0.7), dir: pick % 2 ? -1 : 1, visible: true }
      const swing = f < 0.74 ? 0 : f < 0.9 ? easeInOut((f - 0.74) / 0.16) : 1 - easeOut((f - 0.9) / 0.1)
      p.beat = lerp(8, 0.4, swing)

      // DOM layers, written directly: this runs every frame.
      const heroOut = range(P, 0.01, 0.07)
      for (const layer of [heroOver.current]) {
        if (!layer) continue
        layer.style.opacity = String(1 - heroOut)
        layer.style.transform = `translate3d(0, ${-heroOut * 60}px, 0)`
        layer.style.visibility = heroOut >= 1 ? 'hidden' : 'visible'
      }
      const windows = [
        [0.1, 0.32],
        [0.32, 0.5],
        [0.5, 0.68],
      ]
      captions.current.forEach((c, i) => {
        if (!c) return
        const [a, b] = windows[i]
        const o = Math.min(range(P, a, a + 0.04), 1 - range(P, b - 0.04, b))
        c.style.opacity = String(o)
        c.style.transform = `translate3d(0, ${(1 - o) * 16}px, 0)`
        c.style.visibility = o <= 0 ? 'hidden' : 'visible'
      })
      const labelO = Math.min(range(P, 0.36, 0.44), 1 - range(P, 0.64, 0.7))
      labels.current.forEach((l, k) => {
        if (!l) return
        const x = (k * (ENDS + seam) + ENDS / 2 - p.cam.x) * scale + W / 2
        const y = (0 - p.cam.y) * scale + H / 2 - 20
        l.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`
        l.style.opacity = String(labelO)
        l.style.visibility = labelO <= 0 || narrow ? 'hidden' : 'visible'
      })
      if (finale.current) {
        const o = range(P, 0.7, 0.8)
        finale.current.style.opacity = String(o)
        finale.current.style.transform = `translate3d(0, ${(1 - o) * 30}px, 0)`
        finale.current.style.visibility = o <= 0 ? 'hidden' : 'visible'
      }
      return true
    },
    [n]
  )

  return (
    <section
      ref={section}
      aria-labelledby="hero-title"
      className="relative"
      style={{ height: reduced ? '100svh' : `${PIN * 100}svh` }}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <Cloth
          patterns={clothPatterns}
          frame={frame}
          maxDpr={1.5}
          className="absolute inset-0 z-20"
          fallback={
            <div className="absolute inset-y-0 left-[22%] w-[56vw] opacity-60 md:left-[58%] md:w-[27vw] md:min-w-[240px]">
              <ClothFallback patterns={clothPatterns.slice(-1)} />
            </div>
          }
        />

        {/* The introduction sits on bare cotton beside the loom, never over the
            cloth, so the light that follows the pointer cannot wash it out. */}
        <div ref={heroOver} className="pointer-events-none absolute inset-0 z-30 will-change-transform">
          <div className="gutter mx-auto flex h-full max-w-page flex-col pt-[13svh] md:pt-[max(120px,17svh)]">
            <div className="pointer-events-auto max-w-[620px] md:max-w-[min(640px,48vw)]">
              <Reveal as="p" immediate delay={150} className="t-label text-accent">
                AI + health tech engineer · Accra, Ghana · Remote
              </Reveal>
              <Woven
                as="h1"
                id="hero-title"
                immediate
                delay={250}
                className="t-display mt-5 text-[clamp(64px,9vw,172px)] md:mt-7"
                lines={['Kevin', [{ text: 'Otuteye', italic: true, className: 'text-accent' }]]}
              />
              <Reveal as="p" immediate delay={700} className="mt-6 max-w-[520px] text-[17px] leading-[1.5] text-soft md:mt-9 md:text-[19px]">
                I build healthcare software that clinicians can trust and patients keep using: AI features in
                production, auditable clinical workflows, and the HIPAA-compliant platform under them, at 99.99% uptime.
              </Reveal>
              <Reveal immediate delay={850} className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 md:mt-10">
                <Link
                  href="/work"
                  className="group t-label inline-flex min-h-[48px] items-center gap-4 rounded-full bg-fg px-6 text-ground transition-colors hover:bg-accent"
                >
                  See the work
                  <Arrow className="h-3 w-5 transition-transform duration-500 group-hover:translate-x-1" />
                </Link>
                <Link href="/blog" className="t-label link-underline py-3 text-fg">
                  Read the writing
                </Link>
              </Reveal>
            </div>
            <Reveal immediate delay={1100} className="t-label mt-auto hidden flex-col gap-1 pb-8 text-muted md:flex">
              <span>
                Strip {pad(n)}, after {current?.strip.name} · {current?.company}, on the loom since{' '}
                {current ? shortDate(current.start) : ''}
              </span>
              <span>
                Picks woven since you arrived <span ref={counter} className="text-accent">0000</span>
              </span>
              <span className="mt-3 inline-flex items-center gap-3 text-fg">
                Scroll to weave
                <span className="inline-block h-px w-10 origin-left animate-[thread_2.4s_ease-in-out_infinite] bg-accent" aria-hidden="true" />
              </span>
            </Reveal>
          </div>
        </div>

        {/* Story captions */}
        <div className="gutter pointer-events-none absolute inset-x-0 bottom-[8svh] z-30 mx-auto max-w-page">
          {[
            <>
              Kente is woven on a narrow loom, <em className="italic text-accent">one strip</em> about a hand wide at a time.
            </>,
            <>
              Eight roles, eight strips, each woven after a named cloth. Pull back and the loom has company: every
              finished strip, back to <em className="italic text-accent">2017</em>.
            </>,
            <>
              Sewn edge to edge, the strips make <em className="italic text-accent">one cloth</em>. The pattern only
              appears when they are together.
            </>,
          ].map((text, i) => (
            <div
              key={i}
              ref={(node) => {
                captions.current[i] = node
              }}
              className="absolute bottom-0 max-w-[620px] rounded-sm bg-ground/80 p-5 backdrop-blur-md md:p-6"
              style={{ opacity: 0, visibility: 'hidden' }}
            >
              <p className="t-label mb-3 text-muted">0{i + 1} / 03</p>
              <p className="t-title text-[clamp(26px,2.6vw,40px)] leading-[1.08]">{text}</p>
            </div>
          ))}
        </div>

        {/* A label over each strip once they are all in */}
        <ol aria-hidden="true" className="pointer-events-none absolute inset-0 z-30">
          {chapters.map((c, k) => (
            <li
              key={c.id}
              ref={(node) => {
                labels.current[k] = node
              }}
              className="t-label absolute left-0 top-0 w-[136px] rounded-sm bg-ground/75 px-1 py-1.5 text-center text-[10px] leading-[1.4] backdrop-blur-sm"
              style={{ opacity: 0, visibility: 'hidden' }}
            >
              <span className="block text-accent">{pad(k + 1)}</span>
              <span className="block text-fg">{c.company}</span>
              <span className="block text-muted">
                {c.place?.city ?? ''} {shortDate(c.start).split(' ')[1]}
              </span>
            </li>
          ))}
        </ol>

        {/* The end of the story */}
        <div
          ref={finale}
          className="gutter absolute inset-0 z-30 mx-auto flex max-w-page flex-col items-center justify-center text-center"
          style={{ opacity: 0, visibility: 'hidden' }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
            style={{ background: 'radial-gradient(60% 45% at 50% 50%, rgb(var(--c-ground) / 0.86), rgb(var(--c-ground) / 0.4) 70%, rgb(var(--c-ground) / 0) 100%)' }}
          />
          <p className="t-label mb-6 text-accent">2017 — now · {n} strips</p>
          <h2 className="t-display text-[clamp(64px,10vw,180px)] [text-shadow:0_8px_60px_rgb(var(--c-ground)/0.9)]">
            One cloth,
            <br />
            <em className="italic text-accent">still on the loom.</em>
          </h2>
          <Link
            href="/work"
            className="group t-label mt-10 inline-flex items-center gap-4 rounded-full border border-fg/40 bg-ground/50 px-7 py-4 backdrop-blur transition-colors hover:border-accent hover:text-accent"
          >
            Read it strip by strip
            <Arrow className="h-3 w-5 transition-transform duration-500 ease-out group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  )
}
