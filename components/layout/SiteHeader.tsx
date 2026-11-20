import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { chapterOf, email, projectBySlug } from '../../lib/content'
import Link from '../Link'
import Clocks from './Clocks'

export const NAV = [
  { href: '/work', label: 'Work' },
  { href: '/projects', label: 'Projects' },
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

export default function SiteHeader({ tone }: { tone: 'ink' | 'cotton' }) {
  const { pathname, asPath } = useRouter()
  const current = section(pathname, asPath)
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)

  return (
    <>
      <header className="relative z-20 mx-auto flex w-full max-w-page items-center justify-between gap-6 px-6 py-5 md:px-10 lg:px-16">
        <Link
          href="/"
          aria-label="Kevin Otuteye, home"
          className="t-display py-2 text-[30px] leading-none tracking-[0.02em]"
        >
          K·O
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex gap-8 text-[15px]">
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

        <Clocks tone={tone} className="hidden lg:flex" />

        <button
          ref={menuButton}
          type="button"
          aria-expanded={open}
          aria-controls="menu"
          onClick={() => setOpen(true)}
          className={`t-label inline-flex h-12 items-center border px-5 md:hidden ${
            tone === 'cotton' ? 'border-umber' : 'border-seam'
          }`}
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
    const { style } = document.documentElement
    const previous = style.overflow
    style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      id="menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="fixed inset-0 z-50 flex flex-col bg-ink px-6 py-5 text-cotton"
    >
      <div className="flex items-center justify-between">
        <span className="t-display py-2 text-[30px] leading-none">K·O</span>
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          className="t-label inline-flex h-12 items-center border border-seam px-5"
        >
          Close
        </button>
      </div>
      <nav aria-label="Main" className="mt-12 flex-1">
        <ul className="flex flex-col gap-2">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                aria-current={current === item.href ? 'page' : undefined}
                className="t-display block py-1 text-[72px] aria-[current=page]:text-gold"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex flex-col gap-4 border-t border-seam pt-5">
        <a href={`mailto:${email}`} className="text-[17px] underline underline-offset-4">
          {email}
        </a>
        <Clocks />
      </div>
    </div>
  )
}
