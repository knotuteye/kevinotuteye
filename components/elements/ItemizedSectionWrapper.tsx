type Props = {
  children: React.ReactNode
}

export default function ItemizedSectionWrapper({ children }: Props) {
  return <div className="flex flex-col pt-5 gap-y-16 md:pl-6">{children}</div>
}
