import { colors as themeColors } from '../../Theme'

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
  const colors = Object.keys(themeColors).reverse()
  const color = colors[index % colors.length]
  return (
    <div
      key={project.name + index}
      style={{ borderColor: themeColors[color] }}
      className={`font-heading flex flex-col ml-3 gap-y-1 pl-10 border-dotted border-l-4`}
    >
      <div className={`font-bold text-${colors[index % colors.length]}`}>
        {project.name}
      </div>
      <a className="text-queenBlue break-words" href={project.link}>
        {project.link}
      </a>
      <div className="my-1 font-body">{project.about}</div>
      <div className="flex flex-wrap gap-3">
        {project.technologies.map((tech: string) => (
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
}
