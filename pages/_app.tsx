import type { NextPage } from 'next'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'
import Loom from '../components/Loom'
import SiteFooter from '../components/layout/SiteFooter'
import SiteHeader from '../components/layout/SiteHeader'
import { fontVariables } from '../lib/fonts'
import { cover, reveal } from '../lib/loom'
import '../styles/globals.css'

/** Per-page options, set as static properties on the page component. */
export type Page<P = object> = NextPage<P> & {
  /** 'cotton' is reading mode, used by case studies. */
  tone?: 'ink' | 'cotton'
  /** Hide the footer's "say hello" block (the contact page is already one). */
  footerInvite?: boolean
}

type Shown = { Component: Page; pageProps: AppProps['pageProps']; path: string }

const pathOf = (asPath: string) => asPath.split(/[?#]/)[0]

/**
 * Page changes go through the loom.
 *
 * When the route changes, the old page stays on screen while the cloth drops
 * over it. Only once it is covered does the new page render underneath, scroll
 * to the top and take focus, and then the cloth lifts. This works the same for
 * links, back and forward, because it reacts to the route, not to clicks.
 *
 * With reduced motion `cover()` resolves at once, so this becomes a plain swap.
 */
export default function App({ Component, pageProps, router }: AppProps) {
  const path = pathOf(router.asPath)
  const [shown, setShown] = useState<Shown>({ Component, pageProps, path })
  const transitioning = path !== shown.path
  // Same route (first render, hash change, hot reload): render live props.
  const current: Shown = transitioning ? shown : { Component, pageProps, path }
  const firstPath = useRef(shown.path)

  useEffect(() => {
    window.history.scrollRestoration = 'manual'
  }, [])

  useEffect(() => {
    if (!transitioning) return
    let live = true
    cover().then(() => {
      if (live) setShown({ Component, pageProps, path })
    })
    return () => {
      live = false
    }
  }, [transitioning, Component, pageProps, path])

  // Runs after the new page has committed under the cloth.
  useEffect(() => {
    if (shown.path === firstPath.current) return
    firstPath.current = shown.path
    window.scrollTo(0, 0)
    document.getElementById('main')?.focus({ preventScroll: true })
    requestAnimationFrame(() => {
      reveal()
    })
  }, [shown.path])

  const Page = current.Component
  const tone = Page.tone ?? 'ink'

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#15120F" />
      </Head>
      <div
        className={`${fontVariables} flex min-h-screen flex-col font-sans ${
          tone === 'cotton' ? 'theme-cotton bg-cotton text-ink' : 'bg-ink text-cotton'
        }`}
      >
        <a
          href="#main"
          className="t-label fixed left-4 top-4 z-[60] -translate-y-24 bg-gold px-4 py-3 text-ink focus:translate-y-0"
        >
          Skip to content
        </a>
        <SiteHeader tone={tone} />
        <main id="main" tabIndex={-1} className="flex-1 outline-none" key={current.path}>
          <Page {...current.pageProps} />
        </main>
        <SiteFooter invite={Page.footerInvite ?? true} />
        <Loom />
      </div>
    </>
  )
}
