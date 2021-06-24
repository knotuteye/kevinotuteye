import { useRouter } from 'next/dist/client/router'
import { useState } from 'react'
import Button from '../elements/Button'
import Masthead from '../elements/Masthead'
import MobileMenu from './MobileMenu'
import ContactForm from './ContactForm'

export default function Navbar() {
  const [showContactForm, setShowContactForm] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const router = useRouter()
  const navButtons = [
    {
      text: 'Blog',
      onClick: () => {
        router.push('blog')
      },
    },
    {
      text: 'Work',
      onClick: () => {
        router.push('work')
      },
    },
    {
      text: 'Projects',
      onClick: () => {
        router.push('projects')
      },
    },
    {
      text: 'Say Hi',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      ),
      onClick: () => {
        setShowContactForm(true)
      },
      alt: true,
    },
  ]
  return (
    <>
      <div
        className="flex items-center sticky top-0 bg-white justify-between md:justify-start px-2 py-3 md:p-5"
      >
        <Masthead></Masthead>
        <div className="hidden md:flex flex-1 gap-x-5 justify-end font-body ">
          {navButtons.map((btn, i) => (
            <Button
              text={btn.text}
              alt={btn.alt}
              onClick={btn.onClick}
              key={btn.text}
              icon={btn.icon}
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
      <ContactForm
        show={showContactForm}
        setShow={setShowContactForm}
      ></ContactForm>
      <MobileMenu
        buttons={navButtons}
        show={showMobileMenu}
        setShow={setShowMobileMenu}
      ></MobileMenu>
    </>
  )
}
