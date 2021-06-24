import ExperienceJSON from '../../public/json/experience.json'
import { colors as themeColors } from '../../Theme'
import ItemizedSectionWrapper from '../elements/ItemizedSectionWrapper'
import PageContainer from '../elements/PageContainer'
import PageHeading from '../elements/PageHeading'

export default function Experience({}) {
  const { experience } = ExperienceJSON
  const colors = Object.keys(themeColors).slice(1)
  return (
    <PageContainer>
      <PageHeading
        title="Experience"
        svgPath="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      ></PageHeading>

      <ItemizedSectionWrapper>
        {experience.map((exp, i) => {
          const color = colors[i % colors.length]
          return (
            <div
              key={exp.company}
              style={{ borderColor: themeColors[color] }}
              className={
                'flex flex-col ml-4 pl-4 md:pl-16 border-l-2 font-body '
              }
            >
              <div
                className={`self-end bg-${
                  colors[i % colors.length]
                } text-sm my-1 px-3 py-0.5 rounded-xl text-white`}
              >
                {exp.startDate + ' - ' + exp.endDate}
              </div>
              <div
                className={`text-lg my-1 font-heading font-bold text-${
                  colors[i % colors.length]
                } `}
              >
                {exp.role}
              </div>
              <div className="my-2 font-bold">{exp.company}</div>
              <div className="text-sm md:text-base">{exp.aboutCompany}</div>
              <div className="flex flex-col gap-y-7 mt-5">
                {exp.projects.map((proj, x) => {
                  return (
                    <div
                      key={proj.name + x}
                      style={{
                        borderColor: themeColors[color],
                      }}
                      className={`flex flex-col ml-3 gap-y-1 pl-5 md:pl-10 border-dotted border-l-4`}
                    >
                      <div className="font-bold">{proj.name}</div>
                      <a
                        className="text-queenBlue break-words text-sm md:text-base"
                        href={proj.link}
                      >
                        {proj.link}
                      </a>
                      <div className="my-1 text-sm md:text-base">
                        {proj.about}
                      </div>
                      <div className="flex flex-wrap gap-2 md:gap-3">
                        {proj.technologies.map((tech) => (
                          <div
                            key={tech}
                            style={{
                              borderColor:
                                themeColors[colors[i % colors.length]],
                            }}
                            className={`flex px-1 md:h-8 md:px-3 items-center rounded-sm text-sm border border-${
                              colors[i % colors.length]
                            }`}
                          >
                            {tech}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </ItemizedSectionWrapper>
    </PageContainer>
  )
}
