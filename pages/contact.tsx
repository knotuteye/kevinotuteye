import Clocks from '../components/layout/Clocks'
import NextStrip from '../components/layout/NextStrip'
import { Reveal } from '../components/Reveal'
import Seo from '../components/Seo'
import { contactPoints, location } from '../lib/content'
import type { Page } from './_app'

const ContactPage: Page = () => (
  <>
    <Seo title="Contact" path="/contact" description="Get in touch with Kevin Otuteye by email, GitHub, LinkedIn or GitLab." />
    <div className="pt-20">
      <NextStrip />
    </div>
    <section aria-label="Elsewhere" className="gutter mx-auto max-w-page pb-24">
      <ul className="max-w-[960px]">
        {contactPoints
          .filter((point) => point.id !== 'email')
          .map((point, i) => (
            <Reveal as="li" key={point.id} delay={i * 70}>
              <a
                href={point.href}
                target={point.href.startsWith('http') ? '_blank' : undefined}
                rel={point.href.startsWith('http') ? 'noreferrer' : undefined}
                className="group flex items-baseline justify-between gap-6 border-t border-seam py-6"
              >
                <span className="t-title text-[clamp(36px,4vw,64px)] transition-transform duration-700 ease-out group-hover:translate-x-2 group-hover:italic">
                  {point.label}
                </span>
                <span className="t-label break-all text-right text-soft group-hover:text-fg">
                  {point.handle}
                  {point.href.startsWith('http') ? <span className="sr-only"> (opens in a new tab)</span> : null}
                </span>
              </a>
            </Reveal>
          ))}
      </ul>
      <Reveal className="mt-14 flex flex-wrap items-center justify-between gap-6 border-t border-seam pt-6">
        <Clocks />
        {location ? <p className="t-label text-muted">Based in {location}</p> : null}
      </Reveal>
    </section>
  </>
)

ContactPage.footerInvite = false

export default ContactPage
