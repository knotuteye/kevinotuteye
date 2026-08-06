import { useRouter } from 'next/router'
import { useState } from 'react'
import Button from '../elements/Button'
import Masthead from '../elements/Masthead'
import MobileMenu from './MobileMenu'

/**
 * The nav for the DOM layer.
 *
 * Two entries changed for the same reason: this nav is also the site map, and
 * every item in it was making a promise the site could not keep.
 *
 * "Blog" pointed at a page that is a heading and nothing else — and, unlike
 * every other route, one with no zone in the world, so following it from inside
 * the canvas unmounted the car to arrive at an empty page. The route still
 * exists; it is simply not advertised until there is something behind it.
 *
 * "Say Hi" opened a modal whose send button closed the modal. A form that
 * silently discards what you typed is worse than no form, so it is now a link
 * to /contact, which is a real page and a real place in the world.
 */
export default function Navbar() {
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const router = useRouter()
  const navButtons = [
    {
      text: 'About',
      onClick: () => {
        router.push('/about')
      },
    },
    {
      text: 'Work',
      onClick: () => {
        router.push('/work')
      },
    },
    {
      text: 'Projects',
      onClick: () => {
        router.push('/projects')
      },
    },
    {
      text: 'Say Hi',
      svgPath:
        'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
      onClick: () => {
        router.push('/contact')
      },
      alt: true,
    },
  ]
  return (
    <>
      <div className="flex items-center sticky top-0 bg-white justify-between md:justify-start px-2 py-3 md:p-5">
        <Masthead></Masthead>
        <div className="hidden md:flex flex-1 gap-x-5 justify-end font-body ">
          {navButtons.map((btn) => (
            <Button
              text={btn.text}
              alt={btn.alt}
              onClick={btn.onClick}
              key={btn.text}
              svgPath={btn.svgPath}
            ></Button>
          ))}
        </div>
        <div
          className="md:hidden rounded-sm mr-1 cursor-pointer text-queenBlue"
          onClick={() => setShowMobileMenu(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </div>
      </div>
      <MobileMenu
        buttons={navButtons}
        show={showMobileMenu}
        setShow={setShowMobileMenu}
      ></MobileMenu>
    </>
  )
}
