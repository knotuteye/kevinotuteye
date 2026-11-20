import Image from 'next/image'
import { useCallback, useRef } from 'react'
import { weights, weightsIntro } from '../../lib/content'
import { useScrollProgress } from '../../lib/useScrollProgress'
import Link from '../Link'
import { Reveal, Woven } from '../Reveal'

/**
 * Metrics, weighed in gold. Each figure is set against an Asante or Akan gold
 * weight (abrammuo) from the Cleveland Museum of Art's open access collection,
 * the small cast-brass weights once used to measure gold dust in Kumasi.
 */
export default function Weights() {
  return (
    <section aria-labelledby="weights" className="relative overflow-hidden border-t border-seam">
      <div className="gutter mx-auto max-w-page pb-10 pt-28 md:pt-40">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,460px)] md:items-end">
          <Woven
            id="weights"
            className="t-display text-[clamp(64px,9vw,168px)]"
            lines={['Weighed', [{ text: 'in gold', italic: true, className: 'text-accent' }]]}
          />
          <Reveal as="p" className="t-lede text-soft">
            {weightsIntro}
          </Reveal>
        </div>
      </div>
      <ol className="gutter mx-auto max-w-page pb-28 md:pb-40">
        {weights.map((w, i) => (
          <WeightRow key={w.id} weight={w} index={i} />
        ))}
      </ol>
    </section>
  )
}

function WeightRow({ weight: w, index }: { weight: (typeof weights)[number]; index: number }) {
  const row = useRef<HTMLLIElement>(null)
  const art = useRef<HTMLDivElement>(null)
  const flip = index % 2 === 1

  const onProgress = useCallback((p: number) => {
    const el = art.current
    if (!el) return
    const t = p - 0.5
    el.style.transform = `translate3d(0, ${t * -120}px, 0) rotate(${t * (flip ? 10 : -10)}deg)`
  }, [flip])
  useScrollProgress(row, onProgress)

  return (
    <li
      ref={row}
      className={`grid items-center gap-8 border-t border-seam py-14 md:grid-cols-2 md:gap-16 md:py-20 ${
        flip ? 'md:[&>*:first-child]:order-2' : ''
      }`}
    >
      <div className="relative flex min-h-[260px] items-center justify-center md:min-h-[420px]">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgba(227,166,47,0.4), rgba(227,166,47,0))' }}
        />
        <div ref={art} className="group relative w-[min(78%,420px)] will-change-transform">
          <Image
            src={w.image}
            alt={`${w.title}. ${w.maker}, ${w.date}.`}
            width={w.width}
            height={w.height}
            sizes="(min-width: 768px) 420px, 78vw"
            className="h-auto w-full drop-shadow-[0_40px_40px_rgb(var(--c-shadow)/0.4)] transition-transform duration-[1400ms] ease-out group-hover:rotate-[-4deg] group-hover:scale-[1.04]"
          />
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <Reveal as="p" className="t-label text-muted">
          {String(index + 1).padStart(2, '0')} / {String(weights.length).padStart(2, '0')}
        </Reveal>
        <Reveal as="p" delay={80} className="t-display text-[clamp(88px,12vw,220px)] text-accent">
          {w.metric.value}
        </Reveal>
        <Reveal as="p" delay={140} className="t-title text-[clamp(26px,2.4vw,38px)]">
          {w.metric.label.charAt(0).toUpperCase() + w.metric.label.slice(1)}
          <span className="text-soft"> · </span>
          <Link href={`/work/${w.project.slug}`} className="link-underline italic">
            {w.project.study?.title ?? w.project.title}
          </Link>
        </Reveal>
        <Reveal as="p" delay={200} className="t-label max-w-[420px] leading-[1.7] text-muted">
          {w.title}. {w.maker}, {w.date}.{w.note ? ` ${w.note}` : ''}{' '}
          <a href={w.url} target="_blank" rel="noreferrer" className="link-underline text-soft">
            {w.credit}, {w.accession}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Reveal>
      </div>
    </li>
  )
}
