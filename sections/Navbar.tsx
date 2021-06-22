import { useRouter } from 'next/dist/client/router'
import { useState } from 'react'
import Button from '../components/Button'
import Masthead from '../components/Masthead'
import ContactForm from './ContactForm'

export default function Navbar() {
  const [showContactForm, setShowContactForm] = useState(false)
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
      text: 'Say Hi',
      onClick: () => {
        setShowContactForm(true)
      },
      alt: true,
    },
  ]
  return (
    <>
      <div className="flex items-center py-5 " style={{ padding: '2rem' }}>
        <div>
          <Masthead></Masthead>
        </div>
        <div className="flex flex-1 gap-x-5 justify-end font-body">
          {navButtons.map((btn, i) => (
            <Button
              text={btn.text}
              alt={btn.alt}
              onClick={btn.onClick}
              key={btn.text}
            ></Button>
          ))}
        </div>
      </div>
      <ContactForm
        show={showContactForm}
        setShow={setShowContactForm}
      ></ContactForm>
    </>
  )
}
