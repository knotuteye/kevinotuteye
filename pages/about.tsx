import { useCallback, type ReactNode } from 'react'
import Cloth, { type FrameFn } from '../components/cloth/Cloth'
import { Reveal, Woven } from '../components/Reveal'
import Seo from '../components/Seo'
import { about, chapters, weights } from '../lib/content'
import { ENDS, PERIOD } from '../lib/kente'
import type { Page } from './_app'

function Block({ title, children, delay = 0 }: { title: string; children: ReactNode; delay?: number }) {
  return (
    <Reveal as="section" delay={delay} className="flex flex-col gap-6 border-t border-seam pt-6">
      <h2 className="t-label text-accent">{title}</h2>
      {children}
    </Reveal>
  )
}

/** The KNUST years: the two strips woven in Kumasi as a student. */
const KUMASI_STRIPS = chapters.filter((c) => c.place?.city === 'Kumasi').slice(0, 2)

const AboutPage: Page = () => {
  const { summary, education, certifications, skills, recognition, languages } = about

  const frame = useCallback<FrameFn>((p, ctx) => {
    const n = Math.max(1, KUMASI_STRIPS.length)
    p.cam.scale = ctx.width / (n * ENDS + (n - 1) * 3)
    p.cam.x = (n * ENDS + (n - 1) * 3) / 2
    p.cam.y = window.scrollY / p.cam.scale / 3 + ctx.time * 0.4
    p.seam = 3
    p.drape = 1
    return true
  }, [])

  return (
    <>
      <Seo
        title="About"
        path="/about"
        description="Education, skills, recognition and languages: the background behind Kevin Otuteye's work, and how this site is woven."
      />

      <section className="gutter mx-auto grid max-w-page gap-14 pb-24 pt-36 md:grid-cols-[minmax(0,1fr)_minmax(260px,32%)] md:pb-32 md:pt-48">
        <div className="flex flex-col gap-10">
          <Reveal as="p" className="t-label text-accent">
            About
          </Reveal>
          <Woven
            as="h1"
            className="t-display text-[clamp(80px,12vw,220px)]"
            lines={['Trained in', [{ text: 'Kumasi', italic: true, className: 'text-accent' }]]}
          />
          <Reveal as="p" delay={250} className="t-lede max-w-[720px]">
            {summary}
          </Reveal>
        </div>
        <Reveal delay={200} className="relative h-[460px] self-end md:h-[620px]">
          <Cloth patterns={KUMASI_STRIPS.map((c) => c.strip.pattern)} frame={frame} className="h-full w-full" />
          <p className="t-label mt-4 text-muted">
            Strips {KUMASI_STRIPS.map((c) => String(c.index + 1).padStart(2, '0')).join(' & ')}, woven in Kumasi:{' '}
            {KUMASI_STRIPS.map((c) => c.strip.name).join(', ')}
          </p>
        </Reveal>
      </section>

      <div className="gutter mx-auto grid max-w-page gap-x-14 gap-y-16 pb-28 md:grid-cols-2 md:pb-40">
        <Block title="Education">
          {education.map((school) => (
            <div key={school.qualification} className="flex flex-col gap-3">
              <p className="t-title text-[40px]">{school.qualification}</p>
              <p className="text-[16px] text-soft">
                {school.institution}, {school.location}
              </p>
              <p className="t-label text-muted">{school.year}</p>
              {school.highlights.map((highlight) => (
                <p key={highlight} className="text-[16px] leading-[1.6]">
                  {highlight}
                </p>
              ))}
            </div>
          ))}
        </Block>

        <Block title="Recognition" delay={100}>
          <ul className="flex flex-col gap-6">
            {recognition.map((item) => (
              <li key={item.title} className="flex flex-col gap-2">
                <p className="t-title text-[34px]">{item.title}</p>
                <p className="text-[16px] text-soft">{item.detail}</p>
                <p className="t-label text-muted">{item.year}</p>
              </li>
            ))}
          </ul>
        </Block>

        <Block title="Certifications">
          <ul className="flex flex-col">
            {certifications.map((item) => (
              <li key={item.name} className="flex items-baseline justify-between gap-6 border-b border-seam py-3">
                <span className="text-[17px]">{item.name}</span>
                <span className="t-label text-muted">{item.year}</span>
              </li>
            ))}
          </ul>
        </Block>

        <Block title="Languages" delay={100}>
          <ul className="flex flex-col">
            {languages.map((item) => (
              <li key={item.language} className="flex items-baseline justify-between gap-6 border-b border-seam py-3">
                <span className="text-[17px]">{item.language}</span>
                <span className="t-label text-muted">{item.proficiency}</span>
              </li>
            ))}
          </ul>
        </Block>

        <div className="md:col-span-2">
          <Block title="Threads I work with">
            <dl className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {skills.map((group) => (
                <div key={group.category} className="flex flex-col gap-3">
                  <dt className="t-title text-[28px]">{group.category}</dt>
                  <dd className="text-[15px] leading-[1.7] text-soft">{group.items.join(' · ')}</dd>
                </div>
              ))}
            </dl>
          </Block>
        </div>
      </div>

      <section id="colophon" aria-labelledby="colophon-title" className="scroll-mt-10 border-t border-seam">
        <div className="gutter mx-auto max-w-page py-28 md:py-40">
          <Reveal as="p" className="t-label text-accent">
            Colophon
          </Reveal>
          <Woven
            id="colophon-title"
            className="t-display mt-8 text-[clamp(64px,9vw,168px)]"
            lines={['How this site', [{ text: 'is woven', italic: true, className: 'text-accent' }]]}
          />
          <div className="mt-16 grid gap-x-14 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
            <Block title="The loom">
              <p className="text-[16px] leading-[1.7] text-soft">
                Nothing here is a picture of cloth. Every strip is drawn thread by thread in one WebGL2 shader: each
                pixel works out which warp end and which weft pick it falls on, which of the two is on top, and shades it
                as a twisted yarn under a light that follows your pointer. {chapters.length} strips of {ENDS} ends, on a{' '}
                {PERIOD}-pick repeat, mipmapped so the cloth stays calm when it is far away.
              </p>
            </Block>
            <Block title="The patterns" delay={80}>
              <p className="text-[16px] leading-[1.7] text-soft">
                Kente is woven in narrow strips by Asante weavers around Bonwire, near Kumasi, and by Ewe weavers in the
                Volta Region, then sewn edge to edge. Each strip here is woven after a named design whose meaning suits
                its chapter. The drafts are interpretations made for a screen, not reproductions of those cloths.
              </p>
            </Block>
            <Block title="The gold" delay={160}>
              <p className="text-[16px] leading-[1.7] text-soft">
                The gold weights (abrammuo) are from the Cleveland Museum of Art&apos;s open access collection, released
                under CC0, and photographed by the museum:
              </p>
              <ul className="t-label flex flex-col gap-2 text-muted">
                {weights.map((w) => (
                  <li key={w.id}>
                    <a href={w.url} target="_blank" rel="noreferrer" className="link-underline">
                      {w.title.replace('Gold weight (abrammuo): ', '')} · {w.accession}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Block>
            <Block title="The map">
              <p className="text-[16px] leading-[1.7] text-soft">
                Land from{' '}
                <a href="https://www.naturalearthdata.com" target="_blank" rel="noreferrer" className="link-underline text-fg">
                  Natural Earth
                </a>
                , in the public domain, on an Equal Earth projection centred on 100°W so the whole route fits one sheet.
              </p>
            </Block>
            <Block title="The type" delay={80}>
              <p className="text-[16px] leading-[1.7] text-soft">
                Instrument Serif and Instrument Sans by Instrument, and JetBrains Mono by JetBrains, all under the SIL Open
                Font License.
              </p>
            </Block>
            <Block title="The sound" delay={160}>
              <p className="text-[16px] leading-[1.7] text-soft">
                Off unless you turn it on. The beater&apos;s clack, the shuttle&apos;s swish and the thud of a strip
                landing are synthesised in your browser; there are no audio files. Built with Next.js, React, Tailwind CSS
                and Lenis.
              </p>
            </Block>
          </div>
        </div>
      </section>
    </>
  )
}

export default AboutPage
