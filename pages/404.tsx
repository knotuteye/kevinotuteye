import Link from '../components/Link'
import { Lines, Reveal } from '../components/Reveal'
import Seo from '../components/Seo'
import Weave from '../components/weave/Weave'
import type { Page } from './_app'

const NotFound: Page = () => (
  <>
    <Seo title="Not found" path="/404" noindex />
    <section className="mx-auto grid max-w-page md:min-h-[70vh] md:grid-cols-[minmax(0,1fr)_minmax(240px,28%)]">
      <div className="flex flex-col justify-center gap-8 px-6 py-16 md:px-10 lg:px-16">
        <Reveal as="p" className="t-label text-gold">
          404
        </Reveal>
        <Lines as="h1" className="t-display text-[clamp(72px,13vw,200px)]" lines={['Dropped', 'thread']} />
        <Reveal as="p" delay={250} className="max-w-[520px] text-[19px] leading-[1.55] text-soft">
          This page isn&apos;t part of the cloth. It may have moved, or never existed.
        </Reveal>
        <Reveal delay={350}>
          <Link
            href="/"
            className="inline-flex min-h-[52px] items-center bg-gold px-7 text-[16px] font-semibold text-ink transition-colors hover:bg-cotton"
          >
            Back to the start
          </Link>
        </Reveal>
      </div>
      {/* One strip deliberately missing: the dropped thread. */}
      <div className="grid h-[200px] grid-cols-[2fr_1fr_0.3fr_1fr] gap-[2px] md:h-auto">
        <Weave strips={2} rows={24} seed={5} from={0.2} to={0.4} unit={40} />
        <Weave strips={1} rows={24} seed={6} from={0.5} to={0.5} unit={40} />
        <div className="bg-ink" />
        <Weave strips={1} rows={24} seed={8} from={0.8} to={0.8} unit={40} />
      </div>
    </section>
  </>
)

export default NotFound
