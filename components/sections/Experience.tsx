import ExperienceJSON from '../../public/json/experience.json'
import ItemizedSectionWrapper from '../elements/ItemizedSectionWrapper'
import PageContainer from '../elements/PageContainer'
import PageHeading from '../elements/PageHeading'
import WorkItem from '../elements/WorkItem'

export default function Experience({}) {
  const { experience } = ExperienceJSON
  return (
    <PageContainer>
      <PageHeading
        title="Experience"
        svgPath="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      ></PageHeading>

      <ItemizedSectionWrapper>
        {experience.map((exp, i) => {
          return (
            <WorkItem key={exp.role + i} index={i} workObject={exp}></WorkItem>
          )
        })}
      </ItemizedSectionWrapper>
    </PageContainer>
  )
}
