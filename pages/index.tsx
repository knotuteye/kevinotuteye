import LoomStory from '../components/home/LoomStory'
import Route from '../components/home/Route'
import SelectedWork from '../components/home/SelectedWork'
import Weights from '../components/home/Weights'
import Seo from '../components/Seo'
import type { Page } from './_app'

const Home: Page = () => (
  <>
    <Seo path="/" />
    <LoomStory />
    <SelectedWork />
    <Weights />
    <Route />
  </>
)

export default Home
