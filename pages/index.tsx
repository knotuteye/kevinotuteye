import Link from '../components/Link'
import ProjectRow from '../components/ProjectRow'
import { Arrow, Lines, Reveal } from '../components/Reveal'
import Seo from '../components/Seo'
import Weave from '../components/weave/Weave'
import { BOSTON, chapters, featured, KUMASI, resume, route } from '../lib/content'
import type { Page } from './_app'

const Home: Page = () => {
  return (
    <>
      <Seo path="/" />

      {/* Hero */}
      <section className="mx-auto grid max-w-page md:min-h-[calc(100svh-88px)] md:grid-cols-[minmax(0,1fr)_minmax(320px,36%)]">
        <div className="flex flex-col justify-between gap-12 px-6 pb-10 pt-8 md:px-10 md:pb-12 lg:px-16">
          <div className="flex flex-col gap-7">
            <Reveal as="p" className="t-label text-gold">
              Senior software engineer · LLM features &amp; auditable workflows
            </Reveal>
            <Lines
              as="h1"
              className="t-display text-[clamp(88px,15vw,220px)]"
              lines={['Kevin', 'Otuteye']}
            />
            <Reveal as="p" delay={250} className="max-w-[620px] text-[19px] leading-[1.5] md:text-[21px]">
              I build healthcare software people can trust: Gemini-powered features in production,
              auditable clinical workflows, and a serverless platform running at 99.99% uptime.
            </Reveal>
            <Reveal delay={350} className="flex flex-wrap gap-3">
              <Link
                href="/work"
                className="inline-flex min-h-[52px] items-center bg-gold px-7 text-[16px] font-semibold text-ink transition-colors hover:bg-cotton"
              >
                See the work
              </Link>
              {resume ? (
                <a
                  href={resume}
                  className="inline-flex min-h-[52px] items-center border border-umber px-7 text-[16px] font-medium transition-colors hover:border-cotton"
                >
                  Résumé (PDF)
                </a>
              ) : null}
            </Reveal>
          </div>
          <p className="t-label flex flex-wrap justify-between gap-3 text-muted">
            <span>
              {KUMASI.coords} → {BOSTON.coords}
            </span>
            <span aria-hidden="true">Scroll ↓</span>
          </p>
        </div>
        <Weave
          strips={7}
          rows={30}
          seed={11}
          from={0}
          to={1}
          unit={40}
          scrollShift={0.9}
          interactive
          className="h-[260px] md:h-auto"
        />
      </section>

      {/* Selected work */}
      <section
        aria-labelledby="selected"
        className="mx-auto max-w-page px-6 py-24 md:px-10 md:py-36 lg:px-16"
      >
        <div className="mb-10 flex flex-col justify-between gap-6 md:mb-14 md:flex-row md:items-end">
          <Lines
            as="h2"
            id="selected"
            className="t-display text-[clamp(56px,9vw,128px)]"
            lines={['Selected', 'work']}
          />
          <Reveal as="p" className="max-w-sm text-[16px] leading-[1.55] text-soft">
            {featured.length} pieces from {chapters.length} roles, from a university timetable in
            Kumasi to a clinical platform in Boston.
          </Reveal>
        </div>
        <ol>
          {featured.map((project, index) => (
            <ProjectRow key={project.slug} project={project} index={index} />
          ))}
        </ol>
        <Reveal className="mt-10">
          <Link href="/work" className="group t-label inline-flex items-center gap-3 py-3 text-gold">
            <span className="link-underline">All work, chapter by chapter</span>
            <Arrow className="h-3 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </section>

      <Weave strips={24} rows={6} seed={7} from={0} to={1} unit={20} scrollShift={0.8} className="h-24" />

      {/* The route */}
      <section
        aria-labelledby="route"
        className="mx-auto max-w-page px-6 py-24 md:px-10 md:py-36 lg:px-16"
      >
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <Lines
            as="h2"
            id="route"
            className="t-display text-[clamp(56px,9vw,128px)]"
            lines={[
              'Kumasi',
              <span key="b" className="flex items-center gap-[0.12em]">
                <Arrow className="h-[0.62em] w-[0.8em] text-gold" />
                Boston
              </span>,
            ]}
          />
          <Reveal as="p" className="max-w-sm text-[16px] leading-[1.55] text-soft">
            {chapters.length} roles across {route.length} cities. The cloth on this site shifts from
            Kumasi gold to Boston indigo as the story moves along.
          </Reveal>
        </div>
        <ol className="mt-14 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-5">
          {route.map(({ place, year }, i) => (
            <Reveal as="li" key={place.city} delay={i * 80} className="border-t border-seam pb-10 pt-5">
              <span
                className={`t-label block ${i / (route.length - 1) < 0.5 ? 'text-gold' : 'text-harbour'}`}
              >
                {year}
              </span>
              <span className="t-display mt-3 block text-[clamp(44px,3.6vw,56px)]">{place.city}</span>
              <span className="t-label mt-3 block text-muted">{place.coords}</span>
            </Reveal>
          ))}
        </ol>
        <Reveal className="mt-4">
          <Link href="/work" className="group t-label inline-flex items-center gap-3 py-3 text-gold">
            <span className="link-underline">Read the journey</span>
            <Arrow className="h-3 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </section>
    </>
  )
}

export default Home
