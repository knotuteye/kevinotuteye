import Seo from '../components/Seo'
import WorldPage from '../components/WorldPage'
import Contact from '../components/sections/Contact'
import Navbar from '../components/sections/Navbar'

export default function ContactPage() {
  return (
    <>
      <Seo
        title="Contact"
        path="/contact"
        description="Get in touch with Kevin Otuteye — email, GitHub, LinkedIn and a résumé."
      />
      <WorldPage entry="contact">
        <Navbar />
        <Contact />
      </WorldPage>
    </>
  )
}
