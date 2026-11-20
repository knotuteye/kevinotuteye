import { contactPoints } from '../../lib/content'
import Link from '../Link'
import Clocks from './Clocks'
import { NAV } from './SiteHeader'
import NextStrip from './NextStrip'

/**
 * Always ink, even under a cotton case study, so every page ends on the same
 * loom: a fresh warp, strung and waiting for its first pick. `invite` is off
 * on /contact, which is already the invitation.
 */
export default function SiteFooter({ invite = true }: { invite?: boolean }) {
  return (
    <footer className="relative bg-ground text-fg">
      {invite ? <NextStrip /> : null}

      <div className="gutter mx-auto max-w-page pb-8 pt-16">
        <div className="grid gap-10 border-t border-seam pt-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
          <ul className="flex flex-col gap-2">
            {contactPoints.map((point) => (
              <li key={point.id} className="flex gap-4">
                <span className="t-label w-20 shrink-0 pt-[4px] text-muted">{point.label}</span>
                <a
                  href={point.href}
                  target={point.href.startsWith('http') ? '_blank' : undefined}
                  rel={point.href.startsWith('http') ? 'noreferrer' : undefined}
                  className="link-underline break-all text-[15px]"
                >
                  {point.handle}
                  {point.href.startsWith('http') ? <span className="sr-only"> (opens in a new tab)</span> : null}
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
            <p className="t-label max-w-[300px] text-muted">The loom is in Ghana. The thread goes where the work is.</p>
          </div>
        </div>

        <div className="t-label mt-16 flex flex-wrap justify-between gap-4 text-muted">
          <span>© {new Date().getFullYear()} Kevin Otuteye</span>
          <Link href="/about#colophon" className="link-underline">
            Colophon, credits &amp; sources
          </Link>
        </div>
      </div>
    </footer>
  )
}
