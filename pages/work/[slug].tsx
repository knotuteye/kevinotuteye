import type { GetStaticPaths, GetStaticProps } from 'next'
import Link from '../../components/Link'
import { Arrow, Lines, Reveal } from '../../components/Reveal'
import Seo from '../../components/Seo'
import Weave from '../../components/weave/Weave'
import {
  allProjects,
  chapterOf,
  projectBySlug,
  shortDate,
  warmthOf,
} from '../../lib/content'
import type { Page } from '../_app'

type Props = { slug: string }

/**
 * A project page in reading mode: cotton ground, ink text, indigo accents.
 * Long-form reading is easier on a light ground, and the change of cloth tells
 * you that you have stepped into one piece of work.
 *
 * Projects with an entry in public/json/case-studies.json get a headline and
 * sections; every other project gets its own paragraph, so no page is empty.
 */
const ProjectPage: Page<Props> = ({ slug }) => {
  const project = projectBySlug(slug)
  if (!project) return null
  const chapter = chapterOf(project)
  const study = project.study
  const warmth = warmthOf(project)
  const index = allProjects.findIndex((p) => p.slug === slug)
  const next = allProjects[(index + 1) % allProjects.length]

  const context = chapter
    ? [chapter.company, chapter.place?.city].filter(Boolean).join(' · ')
    : 'Side project'
  const when = chapter
    ? `${shortDate(chapter.start)} — ${chapter.end === 'Present' ? 'Now' : shortDate(chapter.end)}`
    : undefined
  const summary = study?.summary ?? project.subtitle

  return (
    <>
      <Seo
        title={project.title}
        path={`/work/${slug}`}
        description={study?.summary ?? project.about.slice(0, 155)}
      />

      <div className="mx-auto flex max-w-page flex-wrap">
        <Weave
          strips={3}
          rows={36}
          seed={300 + index}
          from={warmth}
          to={warmth}
          unit={40}
          className="min-h-[120px] flex-[0_1_132px] max-md:basis-full"
        />

        <article className="min-w-0 flex-[999_1_560px] px-6 pb-24 pt-8 md:px-10 md:pb-32 lg:px-[72px]">
          <nav aria-label="Breadcrumb" className="t-label flex flex-wrap justify-between gap-3">
            <Link href={chapter ? `/work#${chapter.id}` : '/projects'} className="link-underline py-3">
              ← {chapter ? 'All work' : 'All projects'}
            </Link>
            <span className="py-3 text-umber">{context}</span>
          </nav>

          <header className="mt-10 flex flex-col gap-6">
            {chapter ? (
              <Reveal as="p" className="t-label text-indigo">
                {chapter.role}
              </Reveal>
            ) : null}
            {study?.headline ? (
              <Lines
                as="h1"
                className="t-display text-[clamp(64px,9vw,132px)]"
                lines={[
                  study.headline.from,
                  <span
                    key="to"
                    className="flex items-center gap-[0.15em] text-indigo [font-variation-settings:'wdth'_100]"
                  >
                    <Arrow className="h-[0.6em] w-[0.75em] shrink-0" />
                    {study.headline.to}
                  </span>,
                ]}
              />
            ) : (
              <Lines as="h1" className="t-display text-[clamp(56px,8vw,120px)]" lines={[project.title]} />
            )}
            {summary ? (
              <Reveal as="p" delay={200} className="max-w-[720px] text-[19px] leading-[1.5] md:text-[21px]">
                {summary}
              </Reveal>
            ) : null}
          </header>

          <Reveal as="dl" delay={300} className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-8 gap-y-6 border-t border-ink pt-5">
            {study?.headline ? (
              <div className="flex flex-col gap-2">
                <dt className="t-label text-umber">Project</dt>
                <dd className="text-[16px]">{project.title}</dd>
              </div>
            ) : null}
            {when ? (
              <div className="flex flex-col gap-2">
                <dt className="t-label text-umber">When</dt>
                <dd className="text-[16px]">{when}</dd>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <dt className="t-label text-umber">Stack</dt>
              <dd className="text-[16px]">{project.technologies.join(', ')}</dd>
            </div>
            {project.link ? (
              <div className="flex flex-col gap-2">
                <dt className="t-label text-umber">Live</dt>
                <dd className="text-[16px]">
                  <a href={project.link} target="_blank" rel="noreferrer" className="text-indigo underline underline-offset-4">
                    Visit site <span aria-hidden="true">↗</span>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </dd>
              </div>
            ) : null}
          </Reveal>

          {study?.sections ? (
            <div className="mt-16 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-10">
              {study.sections.map((section, i) => (
                <Reveal as="section" key={section.title} delay={i * 100} className="flex flex-col gap-3">
                  <h2 className="t-sub text-[30px]">{section.title}</h2>
                  <p className="text-[17px] leading-[1.6] text-seam">{section.body}</p>
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal as="p" className="mt-16 max-w-[760px] text-[18px] leading-[1.65] text-seam">
              {project.about}
            </Reveal>
          )}

          {next && next.slug !== slug ? (
            <Link href={`/work/${next.slug}`} className="group mt-24 block border-t border-ink pt-6">
              <span className="t-label text-umber">Next project</span>
              <span className="t-display stretch mt-4 flex items-center gap-[0.2em] text-[clamp(44px,6vw,88px)]">
                {next.title}
                <Arrow className="h-[0.5em] w-[0.65em] shrink-0 text-indigo transition-transform duration-300 group-hover:translate-x-2" />
              </span>
            </Link>
          ) : null}
        </article>
      </div>
    </>
  )
}

ProjectPage.tone = 'cotton'

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: allProjects.map((p) => ({ params: { slug: p.slug } })),
  fallback: false,
})

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => ({
  props: { slug: String(params?.slug) },
})

export default ProjectPage
