import Seo from '../components/Seo'
import WorldPage from '../components/WorldPage'
import Navbar from '../components/sections/Navbar'
import ProjectSection from '../components/sections/ProjectSection'

export default function Projects() {
  return (
    <>
      <Seo
        title="Projects"
        path="/projects"
        description="Side projects by Kevin Otuteye — scheduling algorithms, surveillance backends, PWAs and more."
      />
      <WorldPage entry="projects">
        <Navbar />
        <ProjectSection />
      </WorldPage>
    </>
  )
}
