import Head from 'next/head'

const SITE = 'Kevin Otuteye'
const DEFAULT_DESCRIPTION =
  "Kevin Otuteye — full stack developer and music enthusiast. An explorable 3D portfolio of work, projects and background."

/**
 * Absolute origin, which Open Graph requires and relative paths cannot give.
 *
 * Crawlers do not resolve `og:image` or `og:url` against the page they were
 * found on, so a relative value is simply dropped — which is half of why the
 * previews were blank. Set NEXT_PUBLIC_SITE_URL in the deployment; the fallback
 * is a guess at the production domain and is only ever right by luck.
 */
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kevinotuteye.com'
).replace(/\/$/, '')

export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
}: {
  title?: string
  description?: string
  path?: string
}) {
  const fullTitle = title ? `${title} · ${SITE}` : `${SITE} · Portfolio`
  const url = `${SITE_URL}${path}`
  // The card is drawn per route — see pages/api/og. Passing the section name
  // rather than the full title keeps the eyebrow line on the image short.
  const image = `${SITE_URL}/api/og${
    title ? `?title=${encodeURIComponent(title)}` : ''
  }`

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      {/* Declared so a chat client reserves the right box before the image has
          been fetched, rather than reflowing the card once it lands. */}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta
        property="og:image:alt"
        content={`${SITE} — ${title ?? 'portfolio'}`}
      />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Head>
  )
}
