// TODO: Add screenshot functionality

import ExperienceJSON from '../public/json/experience.json'
import { theme } from '../tailwind.config'
export default function Experience({}) {
  const { experience } = ExperienceJSON
  const colors = Object.keys(theme.colors).filter(
    (x, i) => i !== 0 && !['white'].includes(x)
  )
  return (
    <div className="flex flex-col px-20 py-16">
      <div className="flex gap-x-3 text-4xl items-center p-5 text-redSalsa">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mt-1 h-10 w-10"
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
        <h1 className="font-heading">Work Experience</h1>
      </div>
      <div className="flex flex-col gap-y-16">
        {experience.map((exp, i) => (
          <div
            key={exp.company}
            className={
              'flex flex-col ml-10 pl-24 border-l-2 font-body ' +
              `border-${colors[i % colors.length]}`
            }
          >
            <div
              className={`self-end bg-${
                colors[i % colors.length]
              } text-sm px-3 py-0.5 rounded-xl text-white`}
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
            <div className="">{exp.aboutCompany}</div>
            <div className="flex flex-col gap-y-7 mt-5">
              {exp.projects.map((proj, x) => (
                <div
                  key={proj.name + x}
                  className={`flex flex-col ml-3 gap-y-1 pl-10 border-dotted border-l-4 border-${
                    colors[i % colors.length]
                  }`}
                >
                  <div className="font-bold">{proj.name}</div>
                  <a className="text-queenBlue" href={proj.link}>
                    {proj.link}
                  </a>
                  <div className="my-1">{proj.about}</div>
                  <div className="flex flex-wrap gap-3">
                    {proj.technologies.map((tech) => (
                      <div
                        key={tech}
                        className={`flex h-8 px-3 items-center rounded-sm text-sm border border-${
                          colors[i % colors.length]
                        }`}
                      >
                        {tech}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
