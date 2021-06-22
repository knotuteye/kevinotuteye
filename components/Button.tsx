type ButtonProps = {
  text: string
  icon?: JSX.Element
  onClick?: () => void
  alt?: boolean
}

export default function Button({ text, icon, onClick, alt }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`${
        alt
          ? ' bg-yellowOrange border-yellowOrange font-bold text-white'
          : ' bg-transparent text-redSalsa'
      } flex items-center justify-between gap-x-2 border-2 px-3 py-2 rounded-md text-sm shadow-md`}
    >
      {text}
      {icon}
    </button>
  )
}
