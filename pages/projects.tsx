import type { CSSProperties } from 'react'
import { warpGradient } from '../components/home/SelectedWork'
import Link from '../components/Link'
import { Reveal, Woven } from '../components/Reveal'
import Seo from '../components/Seo'
import { sideProjectEntries } from '../lib/content'
import type { Page } from './_app'

const pad = (n: number) => String(n).padStart(2, '0')

const Projects: Page = () => (
  <>
    <Seo
      title="Projects"
      path="/projects"
      description="Side projects by Kevin Otuteye: a fact-checked LLM job-search pipeline, open-source work for Canonical, a lecture-scheduling algorithm, a surveillance backend, a PWA and an entropy calculator."
    />
    <section className="gutter mx-auto max-w-page pb-28 pt-36 md:pb-40 md:pt-48">
      <Reveal as="p" className="t-label text-accent">
        Off the loom · between lectures and after hours
      </Reveal>
      <Woven
        as="h1"
        className="t-display mt-8 text-[clamp(80px,13vw,240px)]"
        lines={['Side', [{ text: 'projects', italic: true, className: 'text-accent' }]]}
      />
      <Reveal as="p" delay={250} className="t-lede mb-20 mt-12 max-w-[640px] text-soft">
        An LLM pipeline that has to prove every claim it makes, merged contributions to Canonical&apos;s Snap Store,
        a scheduling algorithm now used by a whole college, a backend for live classroom video, a quiz app tuned for
        speed and a calculator for Shannon entropy.
      </Reveal>
      <ol>
        {sideProjectEntries.map((project, i) => (
          <Reveal as="li" key={project.slug} delay={i * 60}>
            <Link
              href={`/work/${project.slug}`}
              className="group relative grid grid-cols-[40px_minmax(0,1fr)] items-baseline gap-x-4 gap-y-3 border-t border-seam py-8 md:grid-cols-[80px_minmax(0,1fr)_minmax(0,360px)] md:gap-x-8 md:py-10"
            >
              <span className="thread-rule" style={{ background: warpGradient(project) } as CSSProperties} aria-hidden="true" />
              <span className="t-label text-muted">{pad(i + 1)}</span>
              <span className="t-display block text-[clamp(44px,6.2vw,112px)] transition-transform duration-700 ease-out group-hover:translate-x-3 group-hover:italic">
                {project.study?.title ?? project.title}
              </span>
              <span className="col-start-2 text-[15px] leading-[1.55] text-soft md:col-start-auto">
                {project.subtitle ?? project.technologies.slice(0, 4).join(' · ')}
              </span>
            </Link>
          </Reveal>
        ))}
      </ol>
    </section>
  </>
)

export default Projects
