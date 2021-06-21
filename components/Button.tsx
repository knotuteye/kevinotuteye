type ButtonProps = {
  text: string
  onClick?: () => {}
  alt?: boolean
}

export default function Button({ text, onClick, alt }: ButtonProps) {
  return (
    <button onClick={onClick} className="">
      {text}
    </button>
  )
}
