import ProjectsJSON from '../public/json/projects.json'
import { theme } from '../tailwind.config'

export default function Projects({}) {
  const { projects } = ProjectsJSON
  const colors = Object.keys(theme.colors).filter(
    (x, i) => i % 2 && i !== 0 && !['white'].includes(x)
  )

  return (
    <div className="flex flex-col px-20 py-16 ">
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
            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
          />
        </svg>
        <h1 className="font-heading">Recent Projects</h1>
      </div>
      <div className="flex flex-col gap-y-16 pl-6">
        <div className="flex flex-col gap-y-7 mt-5">
          {projects.map((proj, x) => (
            <div
              key={proj.name + x}
              className={`font-heading flex flex-col ml-3 gap-y-1 pl-10 border-dotted border-l-4 border-${
                colors[x % colors.length]
              }`}
            >
              <div className={`font-bold text-${colors[x % colors.length]}`}>
                {proj.name}
              </div>
              <a className="text-queenBlue" href={proj.link}>
                {proj.link}
              </a>
              <div className="my-1 font-body">{proj.about}</div>
              <div className="flex flex-wrap gap-3">
                {proj.technologies.map((tech) => (
                  <div
                    key={tech}
                    className={`flex h-8 px-3 items-center rounded-sm text-sm border border-${
                      colors[x % colors.length]
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
    </div>
  )
}
