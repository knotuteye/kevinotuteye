import { useCallback, useRef } from 'react'
import { chapters, clothPatterns, shortDate } from '../../lib/content'
import { DYES, ENDS, wovenText, type Inlay } from '../../lib/kente'
import { clamp, easeInOut, easeOut, lerp, range, useReducedMotion } from '../../lib/motion'
import { clack, swish } from '../../lib/sound'
import Cloth, { type FrameFn } from '../cloth/Cloth'
import ClothFallback from '../cloth/Fallback'
import Link from '../Link'
import { Arrow, Reveal } from '../Reveal'

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

/** How far the section scrolls while the stage is pinned, in viewport heights. */
const PIN = 5.2
const SEAM = 6

/** The name, woven into the strip on the loom in place of its pattern. */
const NAME_LINES = ['Kevin', 'Otuteye']
const NAME_ROWS = wovenText(NAME_LINES)
const NAME_INLAY: Inlay = { strip: clothPatterns.length - 1, rows: NAME_ROWS }
/** Picks from the start to the weaver's rest: the name, and a few above it. */
const NAME_SPAN = NAME_ROWS.length + 3
/**
 * Arrival, in seconds: the warp is strung (0 to WARP_IN), the name is woven
 * (from INTRO_DELAY for INTRO), then the annotations draw in (from NOTES_AT).
 */
const WARP_IN = 0.9
const INTRO_DELAY = 0.75
const INTRO = 3.4
const NOTES_AT = INTRO_DELAY + INTRO - 0.3
/** After that the weaver works on slowly while there is room below the name. */
const IDLE_RATE = 0.45
/** The least bare warp shown above the fell in the hero, in picks. */
const HERO_WARP = 12
/** Picks the scroll weaves over the whole story; scrolling back unweaves them. */
const STORY_PICKS = 140

/**
 * The hero is drawn as a plate: the loom as Fig. 1, its parts labelled with
 * hairline leaders that track the live geometry. Only where there is room
 * beside the strip; on narrow screens the loom stands alone.
 */
type NoteId = 'warp' | 'reed' | 'fell' | 'inlay' | 'strip'
type Note = { id: NoteId; side: 'left' | 'right'; title: string; text: string }
const current = chapters[chapters.length - 1]
const NOTES: Note[] = [
  { id: 'warp', side: 'left', title: 'Warp', text: `${ENDS} ends, strung and waiting` },
  { id: 'reed', side: 'right', title: 'Reed', text: 'Beats each pick into the fell' },
  { id: 'fell', side: 'left', title: 'Fell', text: 'Pick 0001 · shuttle left to right' },
  { id: 'inlay', side: 'right', title: 'Inlay', text: `The name, in ${NAME_ROWS.length} weft-faced picks` },
  {
    id: 'strip',
    side: 'left',
    title: `Strip ${String(clothPatterns.length).padStart(2, '0')}`,
    text: current ? `After ${current.strip.name} · ${current.company}, since ${shortDate(current.start)}` : '',
  },
]
const NOTE_WIDTH = 230

/**
 * The opening of the site, one pinned canvas.
 *
 * It starts close on the current chapter's strip, still on the loom: bare warp
 * above, cloth below, the shuttle laying one pick at a time. The first picks
 * it lays spell the name, the way commemorative kente carries words. Weaving
 * follows the scroll both ways, so the top of the page always shows the name
 * as it was finished. Scrolling pulls back: the seven finished strips arrive, newest first, as if
 * going back in time; then they are sewn edge to edge into one cloth, with the
 * last strip still being woven.
 */
export default function LoomStory() {
  const section = useRef<HTMLElement>(null)
  const heroOver = useRef<HTMLDivElement>(null)
  const captions = useRef<(HTMLDivElement | null)[]>([])
  const labels = useRef<(HTMLLIElement | null)[]>([])
  const finale = useRef<HTMLDivElement>(null)
  const notesLayer = useRef<HTMLDivElement>(null)
  const noteLines = useRef<(SVGPolylineElement | null)[]>([])
  const noteDots = useRef<(SVGCircleElement | null)[]>([])
  const noteLabels = useRef<(HTMLDivElement | null)[]>([])
  const shuttleText = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const weave = useRef({ picks: 0, idle: 0, lastPick: -1, lastClack: 0, shuttleNote: '' })

  const n = clothPatterns.length

  const frame = useCallback<FrameFn>(
    (p, ctx) => {
      const el = section.current
      if (!el) return true
      const { width: W, height: H } = ctx
      const rect = el.getBoundingClientRect()
      const P = ctx.reduced ? 0 : clamp(-rect.top / Math.max(1, rect.height - window.innerHeight))

      // Camera: from the strip on the loom to the whole cloth, zooming in log space.
      // The hero is the loom alone, centred, sized so the woven name fits
      // below the fell with room left to keep weaving.
      const narrow = W < 768
      const heroScale = narrow
        ? Math.min((W * 0.9) / ENDS, (H * 0.48) / NAME_SPAN)
        : Math.min(clamp(W * 0.42, 320, 720) / ENDS, (H * 0.56) / NAME_SPAN)
      // Leave room under the header for the beater and some bare warp.
      const heroFell = Math.max(narrow ? 0.27 : 0.25, (88 + HERO_WARP * heroScale) / H)

      // Weaving: the name first, quickly; then slowly, until the next pick
      // would push the name out of view; plus whatever the scroll adds.
      const w = weave.current
      const introT = ctx.reduced ? 1 : range(ctx.time, INTRO_DELAY, INTRO_DELAY + INTRO)
      const room = 0.86 * H - (heroFell * H + NAME_SPAN * heroScale)
      const idleMax = Math.max(0, Math.floor(room / heroScale))
      if (introT >= 1 && !ctx.reduced) w.idle = Math.min(idleMax, w.idle + ctx.dt * IDLE_RATE)
      else w.idle = Math.min(w.idle, idleMax)
      const goal = NAME_SPAN * easeInOut(introT) + w.idle + Math.round(P * STORY_PICKS)
      w.picks = ctx.reduced ? goal : w.picks + (goal - w.picks) * (1 - Math.pow(0.002, ctx.dt))
      if (Math.abs(goal - w.picks) < 0.002) w.picks = goal
      // A pick joins the cloth only once its whole cycle is done: shuttle
      // across (0..0.7), beater in (0.74..0.9) and back. Counting it any
      // earlier flips the shuttle while the beater is still out, so the next
      // row flashes up fully laid and then vanishes. The clack is on the strike.
      const pick = Math.floor(w.picks)
      const phase = w.picks - pick
      const strike = Math.floor(w.picks + 0.1)
      if (strike !== w.lastPick) {
        if (w.lastPick >= 0) {
          const now = performance.now()
          if (P < 0.7 && now - w.lastClack > 90) {
            w.lastClack = now
            clack(1 - P)
            setTimeout(() => swish(0.45 * (1 - P)), 140)
          }
        }
        w.lastPick = strike
      }

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
      p.cam.x = lerp(lastX, clothWidth(seam) / 2, zoom)
      const fellAt = lerp(heroFell, 0.3, zoom) - push * 0.22
      p.cam.y = (0.5 - fellAt) * (H / scale)
      p.tilt = lerp(0, -0.06, push)
      p.dim = lerp(1, 0.5, push)
      p.drape = lerp(0.5, 1.1, zoom)
      p.shadow.strength = lerp(0.34, 0.22, zoom) * (1 - push * 0.6)
      // Arrival: the warp is strung before the first pick.
      const warpIn = ctx.reduced ? 1 : easeOut(range(ctx.time, 0, WARP_IN))

      // Strips. World y = 0 is the top of the cloth; the last strip's fell sits
      // there too, and its woven cloth flows down as picks are added.
      const length = (H / fitScale) * 1.2 + 80
      const above = (H / fitScale) * 0.3 + length + 40
      const below = (H / fitScale) * 0.7 + 40
      p.strips = clothPatterns.map((_, k) => {
        if (k === n - 1) {
          const woven = pick
          return { slide: w.picks, top: -woven, bottom: length - w.picks, warp: Math.max(0.5, Math.max((H * (narrow ? 0.15 : 0.16)) / scale, HERO_WARP) * warpIn) }
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

      // The plate's annotations, pinned to the parts they name.
      const notes = notesLayer.current
      if (notes) {
        const toX = (x: number) => (x - p.cam.x) * scale + W / 2
        const toY = (y: number) => (y - p.cam.y) * scale + H / 2
        const x0 = (n - 1) * (ENDS + seam)
        const left = toX(x0)
        const right = toX(x0 + ENDS)
        const gap = clamp(W * 0.045, 40, 96)
        const room = left - gap - 14 - NOTE_WIDTH >= 20
        const shown = !narrow && room && heroOut < 1
        notes.style.visibility = shown ? 'visible' : 'hidden'
        notes.style.opacity = String(1 - heroOut)
        if (shown) {
          const strip = p.strips[n - 1]
          const fell = strip.slide + strip.top
          const rows = NAME_ROWS.length
          // Labels hold still where the parts rest; leaders follow the parts.
          const restFell = heroFell * H
          const targets: Record<NoteId, { label: number; x: number; y: number }> = {
            warp: { label: restFell - 4.6 * scale, x: left + 3.5 * scale, y: restFell - 4.6 * scale },
            reed: { label: restFell - 8.8 * scale, x: right - 3 * scale, y: toY(fell - p.beat - 0.8) },
            fell: { label: restFell + 26, x: left + 2.5 * scale, y: toY(fell) },
            inlay: {
              label: restFell + (NAME_SPAN - rows / 2) * scale,
              x: right - 2.5 * scale,
              y: toY(Math.max(fell + 1, w.picks - rows / 2)),
            },
            strip: {
              label: Math.min(H - 150, restFell + (NAME_SPAN + 6) * scale),
              x: left + 4 * scale,
              y: Math.min(H - 150, restFell + (NAME_SPAN + 6) * scale) + 24,
            },
          }
          NOTES.forEach((note, i) => {
            const t = targets[note.id]
            const isLeft = note.side === 'left'
            const start = isLeft ? left - gap : right + gap
            const elbow = isLeft ? left - 12 : right + 12
            const tx = isLeft ? Math.max(t.x, elbow + 4) : Math.min(t.x, elbow - 4)
            const tIn = ctx.reduced ? 1 : easeOut(range(ctx.time, NOTES_AT + i * 0.14, NOTES_AT + i * 0.14 + 0.9))
            const line = noteLines.current[i]
            if (line) {
              line.setAttribute('points', `${start},${t.label} ${elbow},${t.label} ${tx},${t.y}`)
              line.style.strokeDashoffset = String(1 - tIn)
            }
            const dot = noteDots.current[i]
            if (dot) {
              dot.setAttribute('cx', String(tx))
              dot.setAttribute('cy', String(t.y))
              dot.style.opacity = String(range(tIn, 0.8, 1))
            }
            const label = noteLabels.current[i]
            if (label) {
              const lx = isLeft ? start - 14 - NOTE_WIDTH : start + 14
              label.style.transform = `translate3d(${lx}px, ${t.label}px, 0) translateY(-50%)`
              label.style.opacity = String(range(tIn, 0.3, 1))
            }
          })
          const text = `Pick ${pad(pick + 1, 4)} · shuttle ${p.shuttle.dir > 0 ? 'left to right' : 'right to left'}`
          if (text !== w.shuttleNote && shuttleText.current) {
            w.shuttleNote = text
            shuttleText.current.textContent = text
          }
        }
      }

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
          inlay={NAME_INLAY}
          frame={frame}
          maxDpr={1.5}
          className="absolute inset-0 z-20"
          fallback={
            <div className="absolute bottom-0 left-[5%] top-[12%] w-[90vw] opacity-60 md:left-[29%] md:top-[9%] md:w-[42vw] md:min-w-[320px]">
              <ClothFallback patterns={clothPatterns.slice(-1)} />
            </div>
          }
          unsupported={<NameFallback />}
        />

        {/* Fig. 1: the loom, its parts labelled. Leaders and labels are placed
            every frame from the loom's own geometry. Decorative: the parts
            are not content, and the shuttle note changes several times a
            second, so all of it is hidden from assistive tech. */}
        <div ref={notesLayer} aria-hidden="true" className="pointer-events-none absolute inset-0 z-30" style={{ visibility: 'hidden' }}>
          <svg className="absolute inset-0 h-full w-full overflow-visible text-fg">
            {NOTES.map((note, i) => (
              <g key={note.id}>
                <polyline
                  ref={(node) => {
                    noteLines.current[i] = node
                  }}
                  pathLength={1}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity={0.45}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
                />
                <circle
                  ref={(node) => {
                    noteDots.current[i] = node
                  }}
                  r={3.5}
                  className="fill-ground"
                  stroke="currentColor"
                  strokeWidth={1.25}
                  style={{ opacity: 0 }}
                />
              </g>
            ))}
          </svg>
          {NOTES.map((note, i) => (
            <div
              key={note.id}
              ref={(node) => {
                noteLabels.current[i] = node
              }}
              className={`absolute left-0 top-0 ${note.side === 'left' ? 'text-right' : 'text-left'}`}
              style={{ width: NOTE_WIDTH, opacity: 0 }}
            >
              <p className="t-label text-[10px] text-muted">
                <span className="text-accent">{pad(i + 1)}</span> · {note.title}
              </p>
              <p className="mt-1 font-serif text-[17px] leading-[1.2] text-fg">
                {note.id === 'fell' ? <span ref={shuttleText}>{note.text}</span> : note.text}
              </p>
            </div>
          ))}
        </div>

        {/* The name is woven into the cloth, which is hidden from assistive
            tech, so the heading carries it in text; the introduction follows
            the story, in components/home/Intro. */}
        <div ref={heroOver} className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
          <h1 id="hero-title" className="sr-only">
            {NAME_LINES.join(' ')}
          </h1>
          <div className="gutter mx-auto grid max-w-page grid-cols-[1fr_auto_1fr] items-center gap-6 pb-[max(20px,3.5svh)]">
            <Reveal immediate delay={(NOTES_AT + 0.6) * 1000} className="t-label hidden text-[10px] text-muted lg:block">
              Fig. 1 · The loom, still weaving
            </Reveal>
            <Reveal
              immediate
              delay={(INTRO_DELAY + INTRO) * 1000}
              className="t-label col-start-2 inline-flex items-center gap-3 rounded-full bg-ground/80 px-4 py-2 text-fg backdrop-blur-sm"
            >
              Scroll to weave
              <span className="inline-block h-px w-10 origin-left animate-[thread_2.4s_ease-in-out_infinite] bg-accent" aria-hidden="true" />
            </Reveal>
            <Reveal
              immediate
              delay={(NOTES_AT + 0.8) * 1000}
              className="t-label hidden justify-self-end text-[10px] text-muted lg:block [@media(pointer:coarse)]:!hidden"
            >
              Hover the cloth · press to dent it
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

/**
 * Without WebGL2 there is no loom, so the name is drawn as the same picks,
 * flat, where the loom would have woven it.
 */
function NameFallback() {
  return (
    <div className="absolute left-[5%] top-[27%] w-[90vw] md:left-[29%] md:top-[25%] md:w-[42vw] md:min-w-[320px]">
      <svg viewBox={`0 0 ${ENDS} ${NAME_ROWS.length}`} className="block h-auto w-full" shapeRendering="crispEdges">
        {NAME_ROWS.flatMap((row, y) =>
          row.map((dye, x) => <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={DYES[dye]} />)
        )}
      </svg>
    </div>
  )
}
