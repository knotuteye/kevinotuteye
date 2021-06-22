type ButtonProps = {
  text: string
  onClick?: () => void
  alt?: boolean
}

export default function Button({ text, onClick, alt }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`${
        alt
          ? ' bg-yellowOrange border-yellowOrange font-bold text-white'
          : ' bg-transparent text-redSalsa'
      } border-2 px-3 py-2 rounded-md text-sm shadow-md`}
    >
      {text}
    </button>
  )
}
