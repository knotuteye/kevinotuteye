import { colors } from '../../Theme'

type Props = {
  title: string
  index: number
  children: React.ReactNode
}

export default function AboutBlock({ title, index, children }: Props) {
  const color = Object.keys(colors)[index % Object.keys(colors).length]

  return (
    <div
      style={{ borderColor: colors[color] }}
      className="flex flex-col ml-4 pl-4 md:pl-16 border-l-2 font-body"
    >
      <div className={`text-lg my-1 font-heading font-bold text-${color}`}>
        {title}
      </div>
      <div className="flex flex-col gap-y-4 mt-3">{children}</div>
    </div>
  )
}
