import ProjectRow from '../components/ProjectRow'
import { Lines, Reveal } from '../components/Reveal'
import Seo from '../components/Seo'
import { sideProjectEntries } from '../lib/content'
import type { Page } from './_app'

const Projects: Page = () => (
  <>
    <Seo
      title="Projects"
      path="/projects"
      description="Side projects by Kevin Otuteye: open-source work for Canonical, a lecture-scheduling algorithm, a surveillance backend, a PWA and an entropy calculator."
    />
    <section className="mx-auto max-w-page px-6 pb-24 pt-10 md:px-10 md:pb-36 md:pt-16 lg:px-16">
      <Reveal as="p" className="t-label text-gold">
        Outside the roles
      </Reveal>
      <Lines
        as="h1"
        className="t-display mt-6 text-[clamp(72px,13vw,200px)]"
        lines={['Side', 'projects']}
      />
      <Reveal as="p" delay={250} className="mb-14 mt-10 max-w-[620px] text-[19px] leading-[1.55] text-soft">
        Merged contributions to Canonical&apos;s Snapcraft and charmhub.io, a scheduling algorithm
        now used by a whole college, a backend for live classroom video, a quiz app tuned for speed
        and a calculator for Shannon entropy.
      </Reveal>
      <ol>
        {sideProjectEntries.map((project, index) => (
          <ProjectRow key={project.slug} project={project} index={index} />
        ))}
      </ol>
    </section>
  </>
)

export default Projects
