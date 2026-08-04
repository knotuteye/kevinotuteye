import { colorAt } from '../../lib/palette'

type Props = {
  children: string
  index: number
}

export default function TechItem({ children, index }: Props) {
  return (
    <div
      key={children}
      style={{ borderColor: colorAt(index) }}
      className={`flex h-8 px-3 items-center rounded-sm text-sm border`}
    >
      {children}
    </div>
  )
}
