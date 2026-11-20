import type { GetStaticPaths, GetStaticProps } from 'next'
import Link from '../../components/Link'
import Prose from '../../components/Prose'
import { Arrow, Reveal, Woven } from '../../components/Reveal'
import Seo from '../../components/Seo'
import { allPosts, metaOf, postBySlug, type Post, type PostMeta } from '../../lib/blog'
import type { Page } from '../_app'

type Props = { post: Post; next: PostMeta | null }

const PostPage: Page<Props> = ({ post, next }) => (
  <>
    <Seo title={post.title} path={`/blog/${post.slug}`} description={post.summary} />
    <article className="gutter mx-auto max-w-page pb-24 pt-36 md:pb-36 md:pt-48">
      <nav aria-label="Breadcrumb" className="t-label flex flex-wrap justify-between gap-3 border-b border-seam pb-4">
        <Link href="/blog" className="link-underline py-2">
          ← All writing
        </Link>
        <span className="py-2 text-muted">{post.source}</span>
      </nav>

      <header className="mx-auto mt-16 max-w-[880px] md:mt-24">
        <Reveal as="p" className="t-label flex flex-wrap gap-x-4 gap-y-1 text-muted">
          <time dateTime={post.date}>{post.dateLabel}</time>
          <span>{post.minutes} min read</span>
          <span className="text-accent2">{post.tags.join(' · ')}</span>
        </Reveal>
        <Woven as="h1" className="t-display mt-8 text-[clamp(52px,7vw,120px)] leading-[0.92]" lines={[post.title]} />
        <Reveal as="p" delay={200} className="t-lede mt-10 text-fg">
          {post.summary}
        </Reveal>
      </header>

      <Reveal delay={300} className="mx-auto mt-16 max-w-[720px] border-t border-seam pt-12">
        <Prose blocks={post.blocks} />
      </Reveal>

      {next ? (
        <Link href={`/blog/${next.slug}`} className="group mx-auto mt-32 block max-w-[880px] border-t border-fg pt-6">
          <span className="t-label text-muted">Next note</span>
          <span className="t-title mt-6 flex items-center gap-[0.3em] text-[clamp(36px,4.4vw,72px)] leading-[1.02] transition-transform duration-700 ease-out group-hover:translate-x-3 group-hover:italic">
            {next.title}
            <Arrow className="h-[0.3em] w-[0.5em] shrink-0 text-accent2 transition-transform duration-500 group-hover:translate-x-2" />
          </span>
        </Link>
      ) : null}
    </article>
  </>
)

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: allPosts().map((p) => ({ params: { slug: p.slug } })),
  fallback: false,
})

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const post = postBySlug(String(params?.slug))
  if (!post) return { notFound: true }
  const posts = allPosts()
  const at = posts.findIndex((p) => p.slug === post.slug)
  const following = posts[(at + 1) % posts.length]
  const next = following && following.slug !== post.slug ? metaOf(following) : null
  return { props: { post, next } }
}

export default PostPage
