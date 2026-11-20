import Image from 'next/image'
import type { ReactNode } from 'react'
import { Lines, Reveal } from '../components/Reveal'
import Seo from '../components/Seo'
import Weave from '../components/weave/Weave'
import { about } from '../lib/content'
import type { Page } from './_app'

function Block({ title, children, delay = 0 }: { title: string; children: ReactNode; delay?: number }) {
  return (
    <Reveal as="section" delay={delay} className="flex flex-col gap-5 border-t border-seam pt-5">
      <h2 className="t-label text-gold">{title}</h2>
      {children}
    </Reveal>
  )
}

const AboutPage: Page = () => {
  const { summary, education, certifications, skills, recognition, languages } = about
  return (
    <>
      <Seo
        title="About"
        path="/about"
        description="Education, skills, recognition and languages: the background behind Kevin Otuteye's work."
      />

      <section className="mx-auto grid max-w-page gap-12 px-6 pb-20 pt-10 md:grid-cols-[minmax(0,1fr)_minmax(280px,38%)] md:px-10 md:pb-28 md:pt-16 lg:px-16">
        <div className="flex flex-col gap-8">
          <Reveal as="p" className="t-label text-gold">
            About
          </Reveal>
          <Lines
            as="h1"
            className="t-display text-[clamp(72px,12vw,180px)]"
            lines={['Trained in', 'Kumasi']}
          />
          <Reveal as="p" delay={250} className="max-w-[680px] text-[19px] leading-[1.55] md:text-[21px]">
            {summary}
          </Reveal>
        </div>

        {/* The portrait sits in a solid block, the one cell of the weave that
            may hold an image, with a strip of cloth either side. */}
        <Reveal delay={200} className="grid h-[420px] grid-cols-[1fr_3fr_1fr] gap-[2px] self-end md:h-[520px]">
          <Weave strips={1} rows={12} seed={21} from={0} to={0.2} unit={40} />
          <div className="relative overflow-hidden bg-gold">
            <Image
              src="/img/profile.png"
              alt="Portrait of Kevin Otuteye"
              fill
              sizes="(min-width: 768px) 24vw, 60vw"
              className="object-contain object-bottom"
              priority
            />
          </div>
          <Weave strips={1} rows={12} seed={22} from={0.8} to={1} unit={40} />
        </Reveal>
      </section>

      <div className="mx-auto grid max-w-page gap-x-10 gap-y-14 px-6 pb-24 md:grid-cols-2 md:px-10 md:pb-36 lg:px-16">
        <Block title="Education">
          {education.map((school) => (
            <div key={school.qualification} className="flex flex-col gap-2">
              <p className="t-sub text-[30px]">{school.qualification}</p>
              <p className="text-[16px] text-soft">
                {school.institution}, {school.location}
              </p>
              <p className="t-label text-muted">{school.year}</p>
              {school.highlights.map((highlight) => (
                <p key={highlight} className="text-[16px] leading-[1.55]">
                  {highlight}
                </p>
              ))}
            </div>
          ))}
        </Block>

        <Block title="Recognition" delay={100}>
          <ul className="flex flex-col gap-5">
            {recognition.map((item) => (
              <li key={item.title} className="flex flex-col gap-1">
                <p className="t-sub text-[26px]">{item.title}</p>
                <p className="text-[16px] text-soft">{item.detail}</p>
                <p className="t-label text-muted">{item.year}</p>
              </li>
            ))}
          </ul>
        </Block>

        <Block title="Certifications">
          <ul className="flex flex-col gap-3">
            {certifications.map((item) => (
              <li key={item.name} className="flex items-baseline justify-between gap-6 border-b border-seam pb-3">
                <span className="text-[17px]">{item.name}</span>
                <span className="t-label text-muted">{item.year}</span>
              </li>
            ))}
          </ul>
        </Block>

        <Block title="Languages" delay={100}>
          <ul className="flex flex-col gap-3">
            {languages.map((item) => (
              <li key={item.language} className="flex items-baseline justify-between gap-6 border-b border-seam pb-3">
                <span className="text-[17px]">{item.language}</span>
                <span className="t-label text-muted">{item.proficiency}</span>
              </li>
            ))}
          </ul>
        </Block>

        <div className="md:col-span-2">
          <Block title="Skills">
            <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {skills.map((group) => (
                <div key={group.category} className="flex flex-col gap-3">
                  <dt className="t-sub text-[24px]">{group.category}</dt>
                  <dd className="t-label leading-[1.9] text-soft">{group.items.join(' · ')}</dd>
                </div>
              ))}
            </dl>
          </Block>
        </div>
      </div>
    </>
  )
}

export default AboutPage
