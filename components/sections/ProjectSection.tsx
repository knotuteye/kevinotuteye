import ProjectsJSON from '../../public/json/projects.json'
import { colors as themeColors } from '../../Theme'
import ItemizedSectionWrapper from '../elements/ItemizedSectionWrapper'
import PageContainer from '../elements/PageContainer'
import PageHeading from '../elements/PageHeading'
import ProjectItem from '../elements/ProjectItem'

export default function Projects({}) {
  const { projects } = ProjectsJSON
  const colors = Object.keys(themeColors).reverse()

  return (
    <PageContainer>
      <PageHeading
        title="Recent Projects"
        svgPath="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
      ></PageHeading>
      <ItemizedSectionWrapper>
        {projects.map((proj, i) => {
          return <ProjectItem project={proj} index={i}></ProjectItem>
        })}
      </ItemizedSectionWrapper>
    </PageContainer>
  )
}
