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
        alt ? ' bg-starBlue text-white' : ' bg-transparent text-starBlue'
      } border-2 border-starBlue px-3 py-2 rounded-md text-sm`}
    >
      {text}
    </button>
  )
}
