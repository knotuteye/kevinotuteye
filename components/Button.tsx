type ButtonProps = {
  text: string
  onClick?: () => void
  alt?: boolean
}

export default function Button({ text, onClick, alt }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={
        alt
          ? 'border-2 border-starBlue px-3 py-2 rounded-md bg-starBlue text-white'
          : 'border-2 border-starBlue px-3 py-2 rounded-md bg-transparent text-starBlue'
      }
    >
      {text}
    </button>
  )
}
