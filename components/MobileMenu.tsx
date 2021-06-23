import { Dispatch, SetStateAction } from 'react'

type Props = {
  buttons: Button[]
  show: boolean
  setShow: Dispatch<SetStateAction<boolean>>
}

type Button = {
  text: string
  icon?: JSX.Element
  onClick: () => void
  alt?: boolean
}

export default function MobileMenu({ buttons, show, setShow }: Props) {
  return show ? (
    <div className="md:hidden w-screen h-screen fixed top-0 py-24 px-10 bg-redSalsa bg-opacity-90">
      <div
        className="text-white absolute top-2 right-2"
        onClick={() => setShow(false)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <div className="flex flex-col items-center justify-center gap-y-10">
        {buttons.map((btn) => (
          <div
            key={btn.text}
            onClick={() => {
              btn.onClick()
              setShow(false)
            }}
            className="cursor-pointer text-white text-3xl"
          >
            {btn.text}
          </div>
        ))}
      </div>
    </div>
  ) : (
    <></>
  )
}
