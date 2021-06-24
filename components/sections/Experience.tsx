import ExperienceJSON from '../../public/json/experience.json'
import { colors as themeColors } from '../../Theme'

export default function Experience({}) {
  const { experience } = ExperienceJSON
  const colors = Object.keys(themeColors).slice(1)
  return (
    <div className="flex flex-col p-5  md:px-20 md:py-16">
      <div className="flex gap-x-3 text-3xl md:text-4xl items-center py-2 md:p-5 text-redSalsa">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mt-1 h-8 w-8 md:h-10 md:w-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <h1 className="font-heading">Experience</h1>
      </div>
      <div className="flex flex-col gap-y-16 md:pl-6">
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
      </div>
    </div>
  )
}
