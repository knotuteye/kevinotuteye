type Props = {
  children: React.ReactNode
}

export default function PageContainer({ children }: Props) {
  return <div className="flex flex-col p-5  md:px-20 md:py-16 ">{children}</div>
}
