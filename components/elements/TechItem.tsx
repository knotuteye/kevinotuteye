import { colors } from '../../Theme'

type Props = {
  children: string
  index: number
}

export default function TechItem({ children, index }: Props) {
  const color =
    Object.keys(colors).reverse()[index % Object.keys(colors).length]
  return (
    <div
      key={children}
      style={{ borderColor: colors[color] }}
      className={`flex h-8 px-3 items-center rounded-sm text-sm border`}
    >
      {children}
    </div>
  )
}
