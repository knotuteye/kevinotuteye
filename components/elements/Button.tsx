type ButtonProps = {
  text: string
  iconClassName?: string
  svgPath?: string
  onClick?: () => void
  alt?: boolean
}

export default function Button({
  text,
  svgPath,
  iconClassName,
  onClick,
  alt,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`${
        alt
          ? ' bg-yellowOrange border-yellowOrange font-bold text-white'
          : ' bg-transparent text-redSalsa border-redSalsa'
      } flex items-center justify-between gap-x-2 border-2 px-3 py-2 rounded-md text-sm shadow-md`}
    >
      {text}
      {svgPath && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={'h-5 w-5' + iconClassName}
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
      )}
    </button>
  )
}
