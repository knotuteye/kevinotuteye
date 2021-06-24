import { colors } from '../../Theme'
import TechItem from './TechItem'

type Props = {
  project: {
    name: string
    link: string
    about: string
    technologies: Array<string>
  }
  index: number
}

export default function ProjectItem({ project, index }: Props) {
  const color = Object.keys(colors)[index % Object.keys(colors).length]

  return (
    <div
      key={project.name + index}
      style={{ borderColor: colors[color] }}
      className={`font-heading flex flex-col ml-3 gap-y-1 pl-10 border-dotted border-l-4`}
    >
      <div className={`font-bold text-${color}`}>{project.name}</div>
      <a className="text-queenBlue break-words" href={project.link}>
        {project.link}
      </a>
      <div className="my-1 font-body">{project.about}</div>
      <div className="flex flex-wrap gap-3">
        {project.technologies.map((tech: string) => (
          <TechItem key={tech + index} index={index}>
            {tech}
          </TechItem>
        ))}
      </div>
    </div>
  )
}
