import { useCallback, useRef } from 'react'
import Cloth, { type FrameFn } from '../components/cloth/Cloth'
import Link from '../components/Link'
import { Arrow, Reveal, Woven } from '../components/Reveal'
import Seo from '../components/Seo'
import { about, accentOf, chapters, clothPatterns, shortDate } from '../lib/content'
import { ENDS } from '../lib/kente'
import { clamp, lerp } from '../lib/motion'
import type { Page } from './_app'

const ACCENT = { gold: 'text-accent', harbour: 'text-accent2' } as const
const pad = (n: number) => String(n).padStart(2, '0')

/**
 * The journey: every role as a chapter, oldest first, so the page reads from
 * Kumasi to Boston. A sticky loom pans across the cloth as you read, so the
 * strip beside each chapter is the one it was woven into.
 */
const Work: Page = () => {
  const sections = useRef<(HTMLElement | null)[]>([])
  const caption = useRef<HTMLDivElement>(null)
  const shown = useRef(-1)
  const pan = useRef({ x: 0, init: false })

  const frame = useCallback<FrameFn>((p, ctx) => {
    const vh = window.innerHeight
    // Fractional chapter index at the middle of the screen.
    let index = 0
    sections.current.forEach((el, k) => {
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.top <= vh * 0.5) index = k + clamp((vh * 0.5 - r.top) / r.height)
    })
    index = clamp(index - 0.5, 0, chapters.length - 1)
    const target = index * ENDS + ENDS / 2
    const s = pan.current
    if (!s.init) {
      s.x = target
      s.init = true
    }
    s.x = lerp(s.x, target, clamp(ctx.dt * 6))
    const narrow = ctx.width < 640
    p.cam.scale = ctx.width / (ENDS * (narrow ? 2.6 : 1.55))
    p.cam.x = s.x
    p.cam.y = window.scrollY / p.cam.scale / 3 + ctx.time * 0.6
    p.seam = 0
    p.drape = 0.8

    const current = Math.round(index)
    if (current !== shown.current && caption.current) {
      shown.current = current
      const c = chapters[current]
      caption.current.querySelector('[data-k]')!.textContent = `Strip ${pad(current + 1)} / ${pad(chapters.length)}`
      caption.current.querySelector('[data-name]')!.textContent = c.strip.name
      caption.current.querySelector('[data-meaning]')!.textContent = c.strip.meaning
    }
    return true
  }, [])

  const first = chapters[0]

  return (
    <>
      <Seo
        title="Work"
        path="/work"
        description="Every role Kevin Otuteye has held, from Truckrsoft in Accra to Retain Health in Boston, each woven as one strip of a kente cloth."
      />

      <header className="gutter mx-auto max-w-page pb-20 pt-36 md:pb-28 md:pt-48">
        <Reveal as="p" className="t-label text-accent">
          The cloth · {first ? shortDate(first.start).split(' ')[1] : ''} — now · {chapters.length} strips
        </Reveal>
        <Woven
          as="h1"
          className="t-display mt-8 text-[clamp(80px,13vw,240px)]"
          lines={['Strip by', [{ text: 'strip', italic: true, className: 'text-accent' }]]}
        />
        <div className="mt-12 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Reveal as="p" delay={200} className="t-lede max-w-[680px]">
            {about.summary}
          </Reveal>
          <Reveal as="nav" delay={300} aria-label="Chapters">
            <ol className="grid grid-cols-2 gap-x-6 border-t border-seam">
              {chapters.map((c) => (
                <li key={c.id} className="border-b border-seam">
                  <a href={`#${c.id}`} className="group flex items-baseline gap-3 py-3 text-[15px]">
                    <span className="t-label text-muted">{pad(c.index + 1)}</span>
                    <span className="link-underline">{c.company}</span>
                  </a>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </header>

      <div className="relative mx-auto grid max-w-page md:grid-cols-[minmax(0,40%)_minmax(0,1fr)]">
        <div className="sticky top-0 z-30 h-[26svh] md:h-[100svh]">
          <Cloth patterns={clothPatterns} frame={frame} className="h-full w-full" />
          <div
            ref={caption}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-ground via-ground/80 to-transparent px-8 pb-8 pt-24 md:block"
          >
            <p data-k className="t-label text-accent" />
            <p data-name className="t-title mt-3 text-[clamp(36px,3.4vw,56px)] italic" />
            <p data-meaning className="mt-2 max-w-[420px] text-[16px] leading-[1.5] text-soft" />
          </div>
        </div>

        <div className="relative z-20 bg-ground">
          {chapters.map((chapter) => {
            const accent = ACCENT[accentOf(chapter.warmth)]
            return (
              <section
                key={chapter.id}
                id={chapter.id}
                ref={(node) => {
                  sections.current[chapter.index] = node
                }}
                aria-labelledby={`${chapter.id}-title`}
                className="scroll-mt-6 border-t border-seam px-6 py-20 md:min-h-[100svh] md:px-14 md:py-28 lg:px-20"
              >
                <Reveal as="p" className={`t-label ${accent}`}>
                  Chapter {pad(chapter.index + 1)} · {shortDate(chapter.start)} —{' '}
                  {chapter.end === 'Present' ? 'now' : shortDate(chapter.end)}
                  {chapter.place ? ` · ${chapter.place.city}, ${chapter.place.country}` : ''}
                </Reveal>
                <Woven
                  id={`${chapter.id}-title`}
                  className="t-display mt-6 text-[clamp(56px,6.4vw,120px)]"
                  lines={[chapter.company]}
                />
                <Reveal as="p" delay={100} className="t-title mt-4 text-[24px] italic text-soft">
                  {chapter.role.charAt(0) + chapter.role.slice(1).toLowerCase()}
                </Reveal>
                <Reveal as="p" delay={150} className="mt-8 max-w-[640px] text-[17px] leading-[1.65] text-soft md:text-[18px]">
                  {chapter.about}
                </Reveal>

                <Reveal delay={200} className="mt-10 max-w-[640px] border-l-2 border-accent/60 pl-5">
                  <p className="t-label text-muted">
                    Woven after <span className="text-fg">{chapter.strip.name}</span>
                  </p>
                  <p className="mt-2 text-[16px] leading-[1.55]">
                    <em className="t-title text-[20px] italic">“{chapter.strip.meaning}”</em>
                    <span className="text-soft"> {chapter.strip.note}</span>
                  </p>
                </Reveal>

                <ul className="mt-14">
                  {chapter.projects.map((project) => (
                    <Reveal as="li" key={project.slug}>
                      <Link
                        href={`/work/${project.slug}`}
                        className="group flex items-start justify-between gap-6 border-t border-seam py-6"
                      >
                        <span className="min-w-0">
                          <span className="t-title block text-[clamp(28px,2.6vw,40px)] transition-transform duration-700 ease-out group-hover:translate-x-2 group-hover:italic">
                            {project.title}
                          </span>
                          <span className="t-label mt-3 block text-muted">
                            {project.technologies.slice(0, 5).join(' · ')}
                          </span>
                        </span>
                        <Arrow className={`mt-4 h-3 w-5 shrink-0 transition-transform duration-500 group-hover:translate-x-1 ${accent}`} />
                      </Link>
                    </Reveal>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default Work
