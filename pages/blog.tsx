import Link from '../components/Link'
import { Lines, Reveal } from '../components/Reveal'
import Seo from '../components/Seo'
import type { Page } from './_app'

/** Not in the navigation until there is something to read. */
const Blog: Page = () => (
  <>
    <Seo title="Journal" path="/blog" noindex />
    <section className="mx-auto max-w-page px-6 pb-24 pt-10 md:px-10 md:pb-36 md:pt-16 lg:px-16">
      <Reveal as="p" className="t-label text-gold">
        Journal
      </Reveal>
      <Lines as="h1" className="t-display mt-6 text-[clamp(72px,13vw,200px)]" lines={['On the', 'loom']} />
      <Reveal as="p" delay={250} className="mt-10 max-w-[560px] text-[19px] leading-[1.55] text-soft">
        Writing is on its way. In the meantime, the work is all here.
      </Reveal>
      <Reveal delay={350} className="mt-10">
        <Link href="/work" className="link-underline t-label inline-block py-3 text-gold">
          See the work
        </Link>
      </Reveal>
    </section>
  </>
)

export default Blog
