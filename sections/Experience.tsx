import { experience } from '../public/experience.json'
export default function Experience({}) {
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
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <h1>Work Experience</h1>
      </div>
      <div className="pl-28 ml-10 border-l-2 border-zomp">
        {experience.slice(0, 1).map((exp) => (
          <div>
            <div>{exp.startDate + ' - ' + exp.endDate}</div>
            <div>{exp.role}</div>
            <div>{exp.company}</div>
            <div>{exp.aboutCompany}</div>
            {exp.projects.map((proj) => (
              <div>
                <div>{proj.name}</div>
                <div>{proj.link}</div>
                <div>{proj.about}</div>
                <div>
                  {proj.technologies.map((tech) => (
                    <div>{tech}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
