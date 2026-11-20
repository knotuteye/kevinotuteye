import { Head, Html, Main, NextScript } from 'next/document'
import { THEME_SCRIPT } from '../lib/theme'

export default function Document() {
  return (
    <Html lang="en" data-theme="light" suppressHydrationWarning>
      <Head>
        {/* Per-page title, description and OG tags live in components/Seo.tsx.
            Fonts are self-hosted by next/font (lib/fonts.ts). */}
        <link rel="icon" href="/favicon.ico" />
        {/* Marks that JavaScript is running, before first paint, so scroll
            reveals only hide content when something will reveal it again. */}
        <script
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
        {/* The visitor's theme, before first paint, so a dark choice never flashes cotton. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
