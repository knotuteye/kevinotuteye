import { useCallback, useEffect, useRef, type CSSProperties } from 'react'
import { chapterOf, chapters, clothPatterns, featured, patternOf, shortDate, type ProjectEntry } from '../../lib/content'
import { DYES, ENDS, PATTERNS, warpEnds } from '../../lib/kente'
import { clamp, lerp } from '../../lib/motion'
import Cloth, { type FrameFn } from '../cloth/Cloth'
import Link from '../Link'
import { Arrow, Reveal, Woven } from '../Reveal'

const pad = (n: number) => String(n).padStart(2, '0')

/** A gradient of a strip's warp, for the thread drawn under a row on hover. */
export function warpGradient(project: ProjectEntry) {
  const ends = warpEnds(PATTERNS[patternOf(project)])
  return `linear-gradient(90deg,${ends.map((d, k) => `${DYES[d]} ${(k / ends.length) * 100}% ${((k + 1) / ends.length) * 100}%`).join(',')})`
}

/**
 * The featured projects. On a pointer device a swatch of the strip each one
 * was woven in hangs from the cursor and swings as it moves.
 */
export default function SelectedWork() {
  const section = useRef<HTMLElement>(null)
  const swatch = useRef<HTMLDivElement>(null)
  const caption = useRef<HTMLSpanElement>(null)
  const state = useRef({ active: -1, show: 0, x: 0, y: 0, tx: 0, ty: 0, vx: 0, strip: 0, slide: 0 })

  const frame = useCallback<FrameFn>((p, ctx) => {
    const s = state.current
    s.show += ((s.active >= 0 ? 1 : 0) - s.show) * clamp(ctx.dt * 8)
    const target = Math.max(0, s.active)
    s.strip += (target - s.strip) * clamp(ctx.dt * 7)
    s.slide += ctx.dt * 3
    const k = s.strip
    p.cam.scale = ctx.width / (ENDS * 1.08)
    p.cam.x = k * ENDS + ENDS / 2
    p.cam.y = s.slide
    p.seam = 0
    p.drape = 0.9
    p.light = { x: ctx.width * 0.3, y: ctx.height * 0.15, z: 420 }
    return true
  }, [])

  // The swatch follows the pointer with a little lag, and swings with speed.
  useEffect(() => {
    const el = swatch.current
    const sec = section.current
    if (!el || !sec) return
    let raf = 0
    const s = state.current
    const tick = () => {
      const px = s.x
      s.x = lerp(s.x, s.tx, 0.16)
      s.y = lerp(s.y, s.ty, 0.16)
      s.vx = lerp(s.vx, s.x - px, 0.2)
      const rot = clamp(s.vx * 0.6, -14, 14)
      el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -50%) rotate(${rot}deg) scale(${0.6 + s.show * 0.4})`
      el.style.opacity = String(s.show)
      raf = requestAnimationFrame(tick)
    }
    const onMove = (e: PointerEvent) => {
      const r = sec.getBoundingClientRect()
      s.tx = e.clientX - r.left
      s.ty = e.clientY - r.top
    }
    sec.addEventListener('pointermove', onMove)
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      sec.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <section ref={section} aria-labelledby="selected" className="gutter relative mx-auto max-w-page py-28 md:py-40">
      <div className="mb-14 grid gap-8 md:mb-20 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] md:items-end">
        <Woven
          id="selected"
          className="t-display text-[clamp(64px,9vw,168px)]"
          lines={['Selected', [{ text: 'work', italic: true, className: 'text-accent' }]]}
        />
        <Reveal as="p" className="t-lede text-soft">
          Health technology first: the clinical platform I own at Retain Health, the AI inside it, and the work on
          either side of it that shows how I build.
        </Reveal>
      </div>

      <ol onPointerLeave={() => (state.current.active = -1)}>
        {featured.map((project, i) => {
          const chapter = chapterOf(project)
          const metric = project.study?.metric
          const strip = chapter ? chapter.index : 0
          return (
            <Reveal as="li" key={project.slug} delay={i * 60}>
              <Link
                href={`/work/${project.slug}`}
                onPointerEnter={(e) => {
                  if (e.pointerType !== 'mouse') return
                  state.current.active = strip
                  if (caption.current && chapter) caption.current.textContent = `Strip ${pad(strip + 1)} · ${chapter.strip.name}`
                }}
                onFocus={() => (state.current.active = -1)}
                className="group relative grid grid-cols-[40px_minmax(0,1fr)] items-baseline gap-x-4 gap-y-3 border-t border-seam py-8 md:grid-cols-[80px_minmax(0,1fr)_auto] md:gap-x-8 md:py-10"
              >
                <span className="thread-rule" style={{ background: warpGradient(project) } as CSSProperties} aria-hidden="true" />
                <span className="t-label text-muted">{pad(i + 1)}</span>
                <span className="min-w-0">
                  <span className="t-display block text-[clamp(44px,6.2vw,112px)] transition-[transform,color] duration-700 ease-out group-hover:translate-x-3 group-hover:italic">
                    {project.study?.title ?? project.title}
                  </span>
                  <span className="t-label mt-4 block text-soft">
                    {chapter
                      ? `${chapter.company} · ${chapter.place?.city ?? ''} ${shortDate(chapter.start).split(' ')[1]} · strip ${pad(strip + 1)}, after ${chapter.strip.name}`
                      : 'Side project · after hours'}
                  </span>
                </span>
                {metric ? (
                  <span className="col-start-2 flex items-baseline gap-4 md:col-start-auto md:flex-col md:items-end md:gap-1 md:text-right">
                    <span className="t-title text-[clamp(34px,3.4vw,60px)] text-accent">{metric.value}</span>
                    <span className="t-label text-muted">{metric.label}</span>
                  </span>
                ) : null}
              </Link>
            </Reveal>
          )
        })}
      </ol>

      <Reveal className="mt-12 flex justify-end">
        <Link href="/work" className="group t-label inline-flex items-center gap-4 text-accent">
          <span className="link-underline">The whole cloth, chapter by chapter</span>
          <Arrow className="h-3 w-5 transition-transform duration-500 group-hover:translate-x-1" />
        </Link>
      </Reveal>

      {/* The hanging swatch: one canvas, panned to the hovered row's strip. */}
      <div
        ref={swatch}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-20 hidden h-[340px] w-[230px] origin-top opacity-0 [@media(hover:hover)]:block"
      >
        <Cloth patterns={clothPatterns} frame={frame} pressable={false} className="h-full w-full shadow-[0_40px_80px_-20px_rgb(var(--c-shadow)/0.55)]" />
        <span ref={caption} className="t-label absolute -bottom-7 left-0 whitespace-nowrap text-[10px] text-soft">
          {chapters.length} strips · one cloth
        </span>
      </div>
    </section>
  )
}
