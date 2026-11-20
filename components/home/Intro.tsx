import { chapters, clothPatterns, shortDate } from '../../lib/content'
import Link from '../Link'
import { Arrow, Reveal } from '../Reveal'

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

/**
 * Who this is and what he does, in words. The hero above is only the loom,
 * with the name woven into it; this is the first thing the scroll story
 * hands over to.
 */
export default function Intro() {
  const n = clothPatterns.length
  const current = chapters[n - 1]

  return (
    <section aria-label="Introduction" className="gutter relative mx-auto max-w-page py-28 md:py-40">
      <Reveal as="p" className="t-label text-accent">
        AI + health tech engineer · Accra, Ghana · Remote
      </Reveal>
      <Reveal
        as="p"
        delay={100}
        className="t-title mt-8 max-w-[1180px] text-[clamp(34px,4.4vw,76px)] leading-[1.06] md:mt-10"
      >
        I build healthcare software that <em className="italic text-accent">clinicians can trust</em> and patients
        keep using: AI features in production, auditable clinical workflows, and the HIPAA-compliant platform under
        them, at 99.99% uptime.
      </Reveal>
      <Reveal
        delay={200}
        className="mt-12 flex flex-col gap-8 border-t border-seam pt-8 md:mt-16 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
          <Link
            href="/work"
            className="group t-label inline-flex min-h-[48px] items-center gap-4 rounded-full bg-fg px-6 text-ground transition-colors hover:bg-accent"
          >
            See the work
            <Arrow className="h-3 w-5 transition-transform duration-500 group-hover:translate-x-1" />
          </Link>
          <Link href="/blog" className="t-label link-underline py-3 text-fg">
            Read the writing
          </Link>
        </div>
        {current ? (
          <p className="t-label text-muted">
            On the loom now: strip {pad(n)}, after {current.strip.name} · {current.company}, since{' '}
            {shortDate(current.start)}
          </p>
        ) : null}
      </Reveal>
    </section>
  )
}
