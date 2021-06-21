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
          ? 'border-2 border-navyBlue px-3 py-2 rounded-md bg-navyBlue text-white'
          : 'border-2 border-navyBlue px-3 py-2 rounded-md bg-transparent text-navyBlue'
      }
    >
      {text}
    </button>
  )
}
