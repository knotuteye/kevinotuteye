import Seo from '../components/Seo'
import WorldPage from '../components/WorldPage'
import Navbar from '../components/sections/Navbar'
import Profile from '../components/sections/Profile'

export default function Home() {
  return (
    <>
      <Seo path="/" />
      <WorldPage entry="intro">
        <Navbar />
        <Profile />
      </WorldPage>
    </>
  )
}
