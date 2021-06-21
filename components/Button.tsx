type ButtonProps = {
  text: string
  onClick?: () => {}
  alt?: boolean
}

export default function Button({ text, onClick, alt }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={
        alt
          ? ''
          : 'bg-transparent border-navyBlue ' +
            'border-2 rounded-md text-navyBlue px-3 py-2'
      }
    >
      {text}
    </button>
  )
}
