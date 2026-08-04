import Seo from '../components/Seo'
import WorldPage from '../components/WorldPage'
import Experience from '../components/sections/Experience'
import Navbar from '../components/sections/Navbar'

export default function Work() {
  return (
    <>
      <Seo
        title="Work"
        path="/work"
        description="Roles and projects Kevin Otuteye has shipped, from Truckrsoft through to Retain Health."
      />
      <WorldPage entry="work">
        <Navbar />
        <Experience />
      </WorldPage>
    </>
  )
}
