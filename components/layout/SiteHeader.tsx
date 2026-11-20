import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { chapterOf, email, projectBySlug } from '../../lib/content'
import { lockScroll } from '../../lib/scroll'
import Link from '../Link'
import Clocks from './Clocks'
import SoundToggle from './SoundToggle'
import ThemeToggle from './ThemeToggle'

export const NAV = [
  { href: '/work', label: 'Work' },
  { href: '/projects', label: 'Projects' },
  { href: '/blog', label: 'Writing' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

/**
 * Project pages all live under /work/[slug], but side projects belong to the
 * Projects section, so that is where the nav should say you are.
 */
function section(pathname: string, asPath: string): string {
  if (pathname === '/work/[slug]') {
    const slug = asPath.split(/[?#]/)[0].split('/').pop() ?? ''
    const project = projectBySlug(slug)
    return project && !chapterOf(project) ? '/projects' : '/work'
  }
  return '/' + (pathname.split('/')[1] ?? '')
}

/**
 * Sits over the top of every page rather than in the flow, so the home page's
 * loom can run edge to edge underneath it.
 */
export default function SiteHeader() {
  const { pathname, asPath } = useRouter()
  const current = section(pathname, asPath)
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)

  return (
    <>
      <header className="gutter absolute inset-x-0 top-0 z-40 mx-auto flex w-full max-w-page items-center justify-between gap-6 pt-5">
        <Link href="/" aria-label="Kevin Otuteye, home" className="group flex items-baseline gap-3 py-2">
          <span className="t-title text-[26px] leading-none">Kevin Otuteye</span>
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex gap-9 text-[15px]">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={current === item.href ? 'page' : undefined}
                  className="link-underline inline-block py-3"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-6 lg:flex">
          <Clocks />
          <ThemeToggle className="text-soft" />
          <SoundToggle className="text-soft" />
        </div>

        <button
          ref={menuButton}
          type="button"
          aria-expanded={open}
          aria-controls="menu"
          onClick={() => setOpen(true)}
          className="t-label inline-flex h-11 items-center rounded-full border border-seam bg-ground/70 px-5 backdrop-blur md:hidden"
        >
          Menu
        </button>
      </header>

      {open ? (
        <MobileMenu
          current={current}
          onClose={() => {
            setOpen(false)
            menuButton.current?.focus()
          }}
        />
      ) : null}
    </>
  )
}

function MobileMenu({ current, onClose }: { current: string; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButton.current?.focus()
    lockScroll(true)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      lockScroll(false)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      id="menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="gutter fixed inset-0 z-[110] flex flex-col bg-ground pb-6 pt-5 text-fg"
    >
      <div className="flex items-center justify-between">
        <span className="t-title py-2 text-[26px] leading-none">Kevin Otuteye</span>
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          className="t-label inline-flex h-11 items-center rounded-full border border-seam px-5"
        >
          Close
        </button>
      </div>
      <nav aria-label="Main" className="mt-14 flex-1">
        <ul className="flex flex-col">
          {NAV.map((item, i) => (
            <li key={item.href} className="border-t border-seam">
              <Link
                href={item.href}
                onClick={onClose}
                aria-current={current === item.href ? 'page' : undefined}
                className="t-display flex items-baseline justify-between py-3 text-[64px] aria-[current=page]:italic aria-[current=page]:text-accent"
              >
                {item.label}
                <span className="t-label text-muted">0{i + 1}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex flex-col gap-4 border-t border-seam pt-5">
        <a href={`mailto:${email}`} className="text-[17px] underline underline-offset-4">
          {email}
        </a>
        <div className="flex items-center justify-between">
          <Clocks />
          <div className="flex items-center gap-5">
            <ThemeToggle className="text-soft" />
            <SoundToggle className="text-soft" />
          </div>
        </div>
      </div>
    </div>
  )
}
