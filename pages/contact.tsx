import Clocks from '../components/layout/Clocks'
import { Lines, Reveal } from '../components/Reveal'
import Seo from '../components/Seo'
import { contactPoints, email, location } from '../lib/content'
import type { Page } from './_app'

const ContactPage: Page = () => (
  <>
    <Seo
      title="Contact"
      path="/contact"
      description="Get in touch with Kevin Otuteye by email, GitHub, LinkedIn or GitLab."
    />
    <section className="mx-auto max-w-page px-6 pb-24 pt-10 md:px-10 md:pb-36 md:pt-16 lg:px-16">
      <Reveal as="p" className="t-label text-gold">
        Contact
      </Reveal>
      <Lines as="h1" className="t-display mt-6 text-[clamp(72px,13vw,200px)]" lines={['Say', 'hello']} />
      <Reveal as="p" delay={250} className="mt-10 max-w-[620px] text-[19px] leading-[1.55] md:text-[21px]">
        Open to senior full-stack and platform roles, and always happy to talk about healthcare
        systems, LLM features and cloud architecture.
        {location ? ` Based in ${location}.` : null}
      </Reveal>

      <Reveal delay={350} className="mt-14">
        <a
          href={`mailto:${email}`}
          className="t-display block w-fit max-w-full break-all text-[clamp(28px,7.5vw,120px)] text-gold transition-colors duration-300 hover:text-cotton"
        >
          {email}
        </a>
      </Reveal>

      <ul className="mt-16 max-w-[880px]">
        {contactPoints
          .filter((point) => point.id !== 'email')
          .map((point, i) => (
            <Reveal as="li" key={point.id} delay={i * 80}>
              <a
                href={point.href}
                target={point.href.startsWith('http') ? '_blank' : undefined}
                rel={point.href.startsWith('http') ? 'noreferrer' : undefined}
                className="group flex items-baseline justify-between gap-6 border-t border-seam py-6"
              >
                <span className="t-sub stretch text-[34px] md:text-[44px]">{point.label}</span>
                <span className="t-label break-all text-right text-soft group-hover:text-cotton">
                  {point.handle}
                  {point.href.startsWith('http') ? <span className="sr-only"> (opens in a new tab)</span> : null}
                </span>
              </a>
            </Reveal>
          ))}
      </ul>

      <Reveal className="mt-16">
        <Clocks />
      </Reveal>
    </section>
  </>
)

ContactPage.footerInvite = false

export default ContactPage
