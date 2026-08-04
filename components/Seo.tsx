import Head from 'next/head'

const SITE = 'Kevin Otuteye'
const DEFAULT_DESCRIPTION =
  "Kevin Otuteye — full stack developer and music enthusiast. An explorable 3D portfolio of work, projects and background."

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

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={path} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </Head>
  )
}
