import ImageGrid, { Image } from '../elements/ImageGrid'
import PageContainer from '../elements/PageContainer'
import PageHeading from '../elements/PageHeading'

export default function GallerySection({ }) {
  const images = [
    {
      url: '/img/profile.png',
      description: '',
      header: '',
      projectLink: ''
    },
    {
      url: '/img/profile.png',
      description: '',
      header: '',
      projectLink: ''
    }, {
      url: '/img/profile.png',
      description: '',
      header: '',
      projectLink: ''
    }, {
      url: '/img/profile.png',
      description: '',
      header: '',
      projectLink: ''
    }, {
      url: '/img/profile.png',
      description: '',
      header: '',
      projectLink: ''
    },{
      url: '/img/profile.png',
      description: '',
      header: '',
      projectLink: ''
    },{
      url: '/img/profile.png',
      description: '',
      header: '',
      projectLink: ''
    },{
      url: '/img/profile.png',
      description: '',
      header: '',
      projectLink: ''
    },{
      url: '/img/profile.png',
      description: '',
      header: '',
      projectLink: ''
    },]

  return (
    <PageContainer>
      <PageHeading
        title="Gallery"
        svgPath="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
      ></PageHeading>
      <ImageGrid images={images}></ImageGrid>
    </PageContainer>
  )
}
