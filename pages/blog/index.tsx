import type { GetStaticProps } from 'next'
import Link from '../../components/Link'
import { Arrow, Reveal, Woven } from '../../components/Reveal'
import Seo from '../../components/Seo'
import { postMetas, type PostMeta } from '../../lib/blog'
import type { Page } from '../_app'

type Props = { posts: PostMeta[] }

const pad = (n: number) => String(n).padStart(2, '0')

/** Notes from the work: how the parts that are hard to see were built. */
const Blog: Page<Props> = ({ posts }) => (
  <>
    <Seo
      title="Writing"
      path="/blog"
      description="Technical writing by Kevin Otuteye on AI in clinical software, audit trails, LLM pipelines that check their own claims, and the WebGL loom behind this site."
    />
    <section className="gutter mx-auto max-w-page pb-28 pt-36 md:pb-40 md:pt-48">
      <Reveal as="p" className="t-label text-accent">
        Writing · {posts.length} notes from the work
      </Reveal>
      <Woven
        as="h1"
        className="t-display mt-8 text-[clamp(80px,13vw,240px)]"
        lines={['Notes from', [{ text: 'the loom', italic: true, className: 'text-accent' }]]}
      />
      <Reveal as="p" delay={250} className="t-lede mb-20 mt-12 max-w-[640px] text-soft">
        How the parts of my work that are hard to see were built: putting AI into clinical software without taking the
        clinician out of it, records that hold up to an audit, and a pipeline that has to prove what it says.
      </Reveal>

      <ol>
        {posts.map((post, i) => (
          <Reveal as="li" key={post.slug} delay={i * 60}>
            <Link
              href={`/blog/${post.slug}`}
              className="group grid grid-cols-[40px_minmax(0,1fr)] gap-x-4 gap-y-4 border-t border-seam py-10 md:grid-cols-[80px_minmax(0,1fr)_minmax(0,380px)] md:gap-x-8 md:py-12"
            >
              <span className="t-label pt-2 text-muted">{pad(i + 1)}</span>
              <span className="min-w-0">
                <span className="t-title block text-[clamp(34px,3.8vw,64px)] leading-[1.02] transition-transform duration-700 ease-out group-hover:translate-x-2 group-hover:italic">
                  {post.title}
                </span>
                <span className="t-label mt-5 flex flex-wrap gap-x-4 gap-y-1 text-muted">
                  <time dateTime={post.date}>{post.dateLabel}</time>
                  <span>{post.minutes} min read</span>
                  <span className="text-accent2">{post.tags.join(' · ')}</span>
                </span>
              </span>
              <span className="col-start-2 flex flex-col gap-5 md:col-start-auto">
                <span className="text-[16px] leading-[1.6] text-soft">{post.summary}</span>
                <span className="t-label inline-flex items-center gap-3 text-fg">
                  Read
                  <Arrow className="h-3 w-5 transition-transform duration-500 group-hover:translate-x-1" />
                </span>
              </span>
            </Link>
          </Reveal>
        ))}
      </ol>
    </section>
  </>
)

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: { posts: postMetas() },
})

export default Blog
