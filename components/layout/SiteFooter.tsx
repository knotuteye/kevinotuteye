import { BOSTON, contactPoints, email, KUMASI } from '../../lib/content'
import Link from '../Link'
import { Lines, Reveal } from '../Reveal'
import Weave from '../weave/Weave'
import Clocks from './Clocks'
import { NAV } from './SiteHeader'

/**
 * Always ink, even under a cotton case study, so every page ends on the same
 * cloth. `invite` is off on /contact, which is already the invitation.
 */
export default function SiteFooter({ invite = true }: { invite?: boolean }) {
  return (
    <footer className="bg-ink text-cotton">
      <Weave strips={24} rows={6} seed={404} from={0} to={1} unit={16} scrollShift={0.6} className="h-[72px]" />

      <div className="mx-auto max-w-page px-6 pb-10 pt-20 md:px-10 md:pt-28 lg:px-16">
        {invite ? (
          <div className="flex flex-col gap-8 pb-20 md:pb-28">
            <Reveal as="p" className="t-label text-gold">
              Say hello
            </Reveal>
            <a
              href={`mailto:${email}`}
              className="block w-fit max-w-full transition-colors duration-300 hover:text-gold"
            >
              <Lines
                as="span"
                className="t-display block break-all text-[clamp(28px,7.5vw,120px)]"
                lines={[email]}
              />
            </a>
            <Reveal as="p" delay={150} className="max-w-[560px] text-[17px] leading-[1.6] text-soft">
              Open to senior full-stack and platform roles, and always happy to talk about
              healthcare systems, LLM features and cloud architecture.
            </Reveal>
          </div>
        ) : null}

        <div className="grid gap-10 border-t border-seam pt-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <ul className="flex flex-col gap-2">
            {contactPoints.map((point) => (
              <li key={point.id} className="flex gap-4">
                <span className="t-label w-20 shrink-0 pt-[3px] text-muted">{point.label}</span>
                <a
                  href={point.href}
                  target={point.href.startsWith('http') ? '_blank' : undefined}
                  rel={point.href.startsWith('http') ? 'noreferrer' : undefined}
                  className="link-underline break-all text-[15px]"
                >
                  {point.handle}
                </a>
              </li>
            ))}
          </ul>
          <nav aria-label="Footer">
            <ul className="flex flex-col gap-2 text-[15px]">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="link-underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex flex-col gap-3 md:items-end md:text-right">
            <Clocks />
            <p className="t-label text-muted">
              {KUMASI.coords} → {BOSTON.coords}
            </p>
          </div>
        </div>

        <div className="t-label mt-16 flex flex-wrap justify-between gap-4 text-muted">
          <span>© {new Date().getFullYear()} Kevin Otuteye</span>
          <span>Set in Archivo, Instrument Sans and JetBrains Mono</span>
        </div>
      </div>
    </footer>
  )
}
