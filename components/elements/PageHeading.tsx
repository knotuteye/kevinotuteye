type Props = {
  title: string
  svgPath: string
}

export default function PageHeading({ title, svgPath }: Props) {
  return (
    <div className="flex gap-x-3 text-3xl md:text-4xl items-center py-2 md:p-5 text-redSalsa">
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
          d={svgPath}
        />
      </svg>
      <h1 className="font-heading">{title}</h1>
    </div>
  )
}
