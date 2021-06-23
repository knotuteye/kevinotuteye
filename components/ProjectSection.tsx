import ProjectsJSON from '../public/json/projects.json'
import { colors as themeColors } from '../Theme'

export default function Projects({}) {
  const { projects } = ProjectsJSON
  const colors = Object.keys(themeColors).reverse()

  return (
    <div className="flex flex-col p-5  md:px-20 md:py-16 ">
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
            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
          />
        </svg>
        <h1 className="font-heading">Recent Projects</h1>
      </div>
      <div className="flex flex-col gap-y-16 md:pl-6">
        <div className="flex flex-col gap-y-7 mt-5">
          {projects.map((proj, x) => {
            const color = colors[x % colors.length]
            return (
              <div
                key={proj.name + x}
                style={{ borderColor: themeColors[color] }}
                className={`font-heading flex flex-col ml-3 gap-y-1 pl-10 border-dotted border-l-4`}
              >
                <div className={`font-bold text-${colors[x % colors.length]}`}>
                  {proj.name}
                </div>
                <a className="text-queenBlue break-words" href={proj.link}>
                  {proj.link}
                </a>
                <div className="my-1 font-body">{proj.about}</div>
                <div className="flex flex-wrap gap-3">
                  {proj.technologies.map((tech) => (
                    <div
                      key={tech}
                      style={{ borderColor: themeColors[color] }}
                      className={`flex h-8 px-3 items-center rounded-sm text-sm border`}
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
    </div>
  )
}
