import type { GetStaticPaths, GetStaticProps } from 'next'
import Image from 'next/image'
import { useCallback } from 'react'
import Cloth, { type FrameFn } from '../../components/cloth/Cloth'
import ClothFallback from '../../components/cloth/Fallback'
import Link from '../../components/Link'
import { Arrow, Reveal, Woven } from '../../components/Reveal'
import Seo from '../../components/Seo'
import { allProjects, chapterOf, chapters, patternOf, projectBySlug, shortDate, weights } from '../../lib/content'
import { ENDS } from '../../lib/kente'
import type { Page } from '../_app'

type Props = { slug: string }

/**
 * A project in reading mode: cotton ground, ink text, indigo accents, set out
 * like a catalogue entry. The strip it was woven in lies across the top, a
 * specimen on the table; if the project has a headline figure, the gold weight
 * it was paired with on the home page sits beside it.
 */
const ProjectPage: Page<Props> = ({ slug }) => {
  const project = projectBySlug(slug)
  const pattern = project ? patternOf(project) : 'ahwepan'

  const frame = useCallback<FrameFn>((p, ctx) => {
    // The strip lies sideways: tilted a quarter turn, running across the band.
    p.tilt = Math.PI / 2
    p.cam.scale = (ctx.height * 0.78) / ENDS
    p.cam.x = ENDS / 2
    p.cam.y = window.scrollY / p.cam.scale / 2 + ctx.time * 0.8
    p.drape = 0.6
    return true
  }, [])

  if (!project) return null
  const chapter = chapterOf(project)
  const study = project.study
  const index = allProjects.findIndex((p) => p.slug === slug)
  const next = allProjects[(index + 1) % allProjects.length]
  const weight = weights.find((w) => w.project.slug === slug)
  const accession = chapter
    ? `KO.${shortDate(chapter.start).split(' ')[1]}.${String(chapter.index + 1).padStart(2, '0')}.${String(chapter.projects.indexOf(project) + 1).padStart(2, '0')}`
    : `KO.SIDE.${String(index + 1).padStart(2, '0')}`
  const when = chapter
    ? `${shortDate(chapter.start)} — ${chapter.end === 'Present' ? 'now' : shortDate(chapter.end)}`
    : undefined
  const summary = study?.summary ?? project.subtitle

  return (
    <>
      <Seo title={project.title} path={`/work/${slug}`} description={study?.summary ?? project.about.slice(0, 155)} />

      <div className="relative mt-20 h-[28svh] min-h-[200px] w-full md:mt-24 md:h-[36svh]">
        <Cloth
          patterns={[pattern]}
          frame={frame}
          className="h-full w-full"
          fallback={<ClothFallback patterns={[pattern]} />}
        />
      </div>

      <article className="gutter mx-auto max-w-page pb-24 pt-8 md:pb-36">
        <nav aria-label="Breadcrumb" className="t-label flex flex-wrap justify-between gap-3 border-b border-fg/20 pb-4">
          <Link href={chapter ? `/work#${chapter.id}` : '/projects'} className="link-underline py-2">
            ← {chapter ? 'The whole cloth' : 'All projects'}
          </Link>
          <span className="py-2 text-muted">
            {accession}
            {chapter ? ` · strip ${String(chapter.index + 1).padStart(2, '0')} of ${chapters.length}, after ${chapter.strip.name}` : ''}
          </span>
        </nav>

        <header className="mt-16 grid gap-10 md:mt-24 md:grid-cols-[minmax(0,1fr)_minmax(0,380px)] md:items-end">
          <div className="flex flex-col gap-8">
            {chapter ? (
              <Reveal as="p" className="t-label text-accent2">
                {chapter.company} · {chapter.place?.city ?? ''} · {chapter.role.toLowerCase()}
              </Reveal>
            ) : (
              <Reveal as="p" className="t-label text-accent2">
                Side project · open source and after hours
              </Reveal>
            )}
            {study?.headline ? (
              <Woven
                as="h1"
                className="t-display text-[clamp(72px,11vw,200px)]"
                lines={[study.headline.from, [{ text: `→ ${study.headline.to}`, italic: true, className: 'text-accent2' }]]}
              />
            ) : (
              <Woven as="h1" className="t-display text-[clamp(64px,9vw,168px)]" lines={[project.title]} />
            )}
          </div>
          {summary ? (
            <Reveal as="p" delay={200} className="t-lede text-soft">
              {summary}
            </Reveal>
          ) : null}
        </header>

        <Reveal as="dl" delay={300} className="mt-16 grid grid-cols-2 gap-x-8 gap-y-6 border-y border-fg/20 py-6 md:grid-cols-4">
          <div className="flex flex-col gap-2">
            <dt className="t-label text-muted">Project</dt>
            <dd className="text-[16px]">{project.title}</dd>
          </div>
          {when ? (
            <div className="flex flex-col gap-2">
              <dt className="t-label text-muted">Woven</dt>
              <dd className="text-[16px]">{when}</dd>
            </div>
          ) : null}
          <div className="col-span-2 flex flex-col gap-2">
            <dt className="t-label text-muted">Threads</dt>
            <dd className="text-[16px]">{project.technologies.join(', ')}</dd>
          </div>
          {project.link ? (
            <div className="flex flex-col gap-2">
              <dt className="t-label text-muted">Live</dt>
              <dd className="text-[16px]">
                <a href={project.link} target="_blank" rel="noreferrer" className="text-accent2 underline underline-offset-4">
                  Visit site <span aria-hidden="true">↗</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </dd>
            </div>
          ) : null}
        </Reveal>

        {study?.image ? (
          <Reveal as="figure" delay={200} className="mt-20">
            <div className="overflow-hidden rounded-md border border-seam bg-loom shadow-[0_40px_80px_-40px_rgb(var(--c-shadow)/0.45)]">
              <div aria-hidden="true" className="flex items-center gap-1.5 border-b border-seam px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-2.5 w-2.5 rounded-full bg-seam" />
                ))}
                {project.link ? (
                  <span className="t-label ml-4 truncate text-[10px] text-muted">{project.link.replace(/^https?:\/\//, '')}</span>
                ) : null}
              </div>
              <Image
                src={study.image.src}
                alt={study.image.alt}
                width={study.image.width}
                height={study.image.height}
                sizes="(min-width: 1600px) 1500px, 94vw"
                className="h-auto w-full"
              />
            </div>
            {study.image.caption ? (
              <figcaption className="t-label mt-4 text-muted">{study.image.caption}</figcaption>
            ) : null}
          </Reveal>
        ) : null}

        {weight ? (
          <section aria-label="Headline figure" className="mt-20 grid items-center gap-8 overflow-hidden rounded-sm bg-loom px-8 py-12 text-fg md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:px-14">
            <Reveal className="flex justify-center">
              <Image
                src={weight.image}
                alt={`${weight.title}. ${weight.maker}, ${weight.date}.`}
                width={weight.width}
                height={weight.height}
                sizes="(min-width: 768px) 360px, 70vw"
                className="h-auto w-[min(70%,360px)] drop-shadow-[0_30px_30px_rgb(var(--c-shadow)/0.45)]"
              />
            </Reveal>
            <div>
              <Reveal as="p" className="t-display text-[clamp(80px,9vw,168px)] text-accent">
                {weight.metric.value}
              </Reveal>
              <Reveal as="p" delay={100} className="t-title mt-3 text-[28px]">
                {weight.metric.label.charAt(0).toUpperCase() + weight.metric.label.slice(1)}
              </Reveal>
              <Reveal as="p" delay={150} className="t-label mt-6 max-w-[380px] leading-[1.7] text-muted">
                Weighed against: {weight.title}. {weight.maker}, {weight.date}.{' '}
                <a href={weight.url} target="_blank" rel="noreferrer" className="link-underline text-soft">
                  {weight.credit}, {weight.accession}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </Reveal>
            </div>
          </section>
        ) : null}

        {study?.sections ? (
          <div className={`mt-20 grid gap-x-12 gap-y-14 ${study.sections.length % 2 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {study.sections.map((section, i) => (
              <Reveal as="section" key={section.title} delay={i * 100} className="flex flex-col gap-4 border-t border-fg pt-5">
                <p className="t-label text-muted">{String(i + 1).padStart(2, '0')}</p>
                <h2 className="t-title text-[34px]">{section.title}</h2>
                <p className="text-[17px] leading-[1.65] text-soft">{section.body}</p>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-20 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <Reveal as="p" className="t-label text-muted">
              The work
            </Reveal>
            <Reveal as="div" className="flex max-w-[760px] flex-col gap-5 text-[19px] leading-[1.65] text-soft">
              {project.about.split('\n').map((para) => (
                <p key={para}>{para}</p>
              ))}
            </Reveal>
          </div>
        )}

        {next && next.slug !== slug ? (
          <Link href={`/work/${next.slug}`} className="group mt-32 block border-t border-fg pt-6">
            <span className="t-label text-muted">Next on the cloth</span>
            <span className="t-display mt-6 flex items-center gap-[0.2em] text-[clamp(56px,8vw,140px)] transition-transform duration-700 ease-out group-hover:translate-x-3 group-hover:italic">
              {next.title}
              <Arrow className="h-[0.32em] w-[0.5em] shrink-0 text-accent2 transition-transform duration-500 group-hover:translate-x-2" />
            </span>
          </Link>
        ) : null}
      </article>
    </>
  )
}


export const getStaticPaths: GetStaticPaths = async () => ({
  paths: allProjects.map((p) => ({ params: { slug: p.slug } })),
  fallback: false,
})

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => ({
  props: { slug: String(params?.slug) },
})

export default ProjectPage
