import Seo from '../components/Seo'
import WorldPage from '../components/WorldPage'
import About from '../components/sections/About'
import Navbar from '../components/sections/Navbar'

export default function AboutPage() {
  return (
    <>
      <Seo
        title="About"
        path="/about"
        description="Education, skills, certifications and languages — the background behind Kevin Otuteye's work."
      />
      <WorldPage entry="about">
        <Navbar />
        <About />
      </WorldPage>
    </>
  )
}
