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
        alt ? ' bg-redSalsa border-redSalsa font-bold text-white' : ' bg-transparent text-orangeRed'
      } border-2 px-3 py-2 rounded-md text-sm`}
    >
      {text}
    </button>
  )
}
