import Link from '../components/Link'
import { Arrow, Lines, Reveal } from '../components/Reveal'
import Seo from '../components/Seo'
import Weave from '../components/weave/Weave'
import { about, accentOf, chapters, shortDate } from '../lib/content'
import type { Page } from './_app'

const ACCENT = { gold: 'text-gold', harbour: 'text-harbour' } as const
const pad = (n: number) => String(n).padStart(2, '0')

/**
 * The journey: every role as a chapter, oldest first, so the page reads from
 * Kumasi to Boston. The weave between chapters is tuned to each chapter's
 * warmth, so the cloth visibly turns from gold to indigo as you scroll.
 */
const Work: Page = () => {
  const first = chapters[0]
  return (
    <>
      <Seo
        title="Work"
        path="/work"
        description="Every role Kevin Otuteye has held, from Truckrsoft in Accra to Retain Health in Boston, with the projects shipped in each."
      />

      <header className="mx-auto max-w-page px-6 pb-20 pt-10 md:px-10 md:pb-28 md:pt-16 lg:px-16">
        <Reveal as="p" className="t-label text-gold">
          The journey · {first ? shortDate(first.start).split(' ')[1] : ''} — now
        </Reveal>
        <Lines
          as="h1"
          className="t-display mt-6 text-[clamp(72px,13vw,200px)]"
          lines={[
            'Kumasi',
            <span key="b" className="flex items-center gap-[0.12em]">
              <Arrow className="h-[0.62em] w-[0.8em] text-gold" />
              Boston
            </span>,
          ]}
        />
        <Reveal as="p" delay={250} className="mt-10 max-w-[760px] text-[19px] leading-[1.55] md:text-[21px]">
          {about.summary}
        </Reveal>
        <Reveal as="nav" delay={350} aria-label="Chapters" className="mt-12">
          <ol className="t-label flex flex-wrap gap-x-6 gap-y-2 text-muted">
            {chapters.map((c) => (
              <li key={c.id}>
                <a href={`#${c.id}`} className="link-underline inline-block py-2 hover:text-cotton">
                  {pad(c.index + 1)} {c.company}
                </a>
              </li>
            ))}
          </ol>
        </Reveal>
      </header>

      {chapters.map((chapter) => {
        const accent = ACCENT[accentOf(chapter.warmth)]
        return (
          <div key={chapter.id}>
            <Weave
              strips={24}
              rows={6}
              seed={100 + chapter.index}
              from={Math.max(0, chapter.warmth - 0.15)}
              to={Math.min(1, chapter.warmth + 0.15)}
              unit={14}
              className="h-14"
            />
            <section
              id={chapter.id}
              aria-labelledby={`${chapter.id}-title`}
              className="mx-auto grid max-w-page scroll-mt-6 gap-10 px-6 py-20 md:grid-cols-[240px_minmax(0,1fr)] md:px-10 md:py-28 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-16"
            >
              <aside className="t-label flex flex-col gap-2 self-start text-muted md:sticky md:top-8">
                <span className={accent}>
                  Chapter {pad(chapter.index + 1)} / {pad(chapters.length)}
                </span>
                <span>
                  {shortDate(chapter.start)} — {chapter.end === 'Present' ? 'Now' : shortDate(chapter.end)}
                </span>
                {chapter.place ? (
                  <>
                    <span className="mt-4 text-cotton">
                      {chapter.place.city}, {chapter.place.country}
                    </span>
                    <span>{chapter.place.coords}</span>
                  </>
                ) : null}
              </aside>

              <div className="min-w-0">
                <Reveal as="p" className={`t-label ${accent}`}>
                  {chapter.role}
                </Reveal>
                <Lines
                  as="h2"
                  id={`${chapter.id}-title`}
                  className="t-display mt-4 text-[clamp(48px,7vw,112px)]"
                  lines={[chapter.company]}
                />
                <Reveal as="p" delay={150} className="mt-6 max-w-[720px] text-[17px] leading-[1.6] text-soft md:text-[18px]">
                  {chapter.about}
                </Reveal>
                <ul className="mt-12">
                  {chapter.projects.map((project) => (
                    <Reveal as="li" key={project.slug}>
                      <Link
                        href={`/work/${project.slug}`}
                        className="group flex items-start justify-between gap-6 border-t border-seam py-6"
                      >
                        <span className="min-w-0">
                          <span className="t-sub stretch block text-[30px] md:text-[38px]">
                            {project.title}
                          </span>
                          <span className="t-label mt-3 block text-muted">
                            {project.technologies.slice(0, 5).join(' · ')}
                          </span>
                        </span>
                        <Arrow
                          className={`mt-3 h-4 w-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1 ${accent}`}
                        />
                      </Link>
                    </Reveal>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        )
      })}
    </>
  )
}

export default Work
