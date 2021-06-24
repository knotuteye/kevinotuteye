import { colors } from '../../Theme'
import ProjectItem from './ProjectItem'

type Props = {
  workObject: {
    role: string
    company: string
    aboutCompany: string
    startDate: string
    endDate: string
    projects: Array<{
      name: string
      link: string
      about: string
      technologies: Array<string>
    }>
  }
  index: number
}

export default function WorkItem({ workObject, index }: Props) {
  const color = Object.keys(colors)[index % Object.keys(colors).length]

  return (
    <div
      key={workObject.company}
      style={{ borderColor: colors[color] }}
      className={'flex flex-col ml-4 pl-4 md:pl-16 border-l-2 font-body '}
    >
      <div
        className={`self-end bg-${color} text-sm my-1 px-3 py-0.5 rounded-xl text-white`}
      >
        {workObject.startDate + ' - ' + workObject.endDate}
      </div>
      <div className={`text-lg my-1 font-heading font-bold text-${color} `}>
        {workObject.role}
      </div>
      <div className="my-2 font-bold">{workObject.company}</div>
      <div className="text-sm md:text-base">{workObject.aboutCompany}</div>
      <div className="flex flex-col gap-y-7 mt-5">
        {workObject.projects.map((proj) => {
          return (
            <ProjectItem
              key={proj.name + index}
              project={proj}
              index={index}
            ></ProjectItem>
          )
        })}
      </div>
    </div>
  )
}
