import type { NextPage } from 'next'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'
import SiteFooter from '../components/layout/SiteFooter'
import SiteHeader from '../components/layout/SiteHeader'
import Transition from '../components/Transition'
import { fontVariables } from '../lib/fonts'
import { scrollToTop, startSmoothScroll, stopSmoothScroll } from '../lib/scroll'
import { restoreSound } from '../lib/sound'
import { cover, reveal } from '../lib/transition'
import '../styles/globals.css'

/** Per-page options, set as static properties on the page component. */
export type Page<P = object> = NextPage<P> & {
  /** Hide the footer's invitation (the contact page is already one). */
  footerInvite?: boolean
}

type Shown = { Component: Page; pageProps: AppProps['pageProps']; path: string }

const pathOf = (asPath: string) => asPath.split(/[?#]/)[0]

/**
 * Page changes go through the cloth.
 *
 * When the route changes, the old page stays on screen while the strips drop
 * over it. Only once it is covered does the new page render underneath,
 * scroll to the top and take focus, and then the strips carry on through. This
 * works the same for links, back and forward, because it reacts to the route,
 * not to clicks. Under reduced motion `cover()` resolves at once.
 */
export default function App({ Component, pageProps, router }: AppProps) {
  const path = pathOf(router.asPath)
  const [shown, setShown] = useState<Shown>({ Component, pageProps, path })
  const transitioning = path !== shown.path
  const current: Shown = transitioning ? shown : { Component, pageProps, path }
  const firstPath = useRef(shown.path)

  useEffect(() => {
    window.history.scrollRestoration = 'manual'
    restoreSound()
    startSmoothScroll()
    return stopSmoothScroll
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
    scrollToTop()
    document.getElementById('main')?.focus({ preventScroll: true })
    requestAnimationFrame(() => {
      reveal()
    })
  }, [shown.path])

  const Page = current.Component

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#F4EFE5" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#100E0B" media="(prefers-color-scheme: dark)" />
      </Head>
      <div
        className={`${fontVariables} grain flex min-h-screen flex-col bg-ground font-sans text-fg`}
      >
        <a
          href="#main"
          className="t-label fixed left-4 top-4 z-[120] -translate-y-24 bg-gold px-4 py-3 text-night focus:translate-y-0"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 outline-none" key={current.path}>
          <Page {...current.pageProps} />
        </main>
        <SiteFooter invite={Page.footerInvite ?? true} />
        <Transition />
      </div>
    </>
  )
}
