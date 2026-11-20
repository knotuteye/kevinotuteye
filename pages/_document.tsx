import { Head, Html, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Per-page title, description and OG tags live in components/Seo.tsx.
            Fonts are self-hosted by next/font (lib/fonts.ts). */}
        <link rel="icon" href="/favicon.ico" />
        {/* Marks that JavaScript is running, before first paint, so scroll
            reveals only hide content when something will reveal it again. */}
        <script
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
