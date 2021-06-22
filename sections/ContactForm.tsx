import { Dispatch, SetStateAction } from 'react'
import Button from '../components/Button'
type Props = {
  show: boolean
  setShow: Dispatch<SetStateAction<boolean>>
}
export default function ContactForm({ show, setShow }: Props) {
  function dismissHandler(e: HTMLDivElement) {
    if (e.id === 'backdrop') setShow(false)
  }
  return show ? (
    <div
      id="backdrop"
      className="flex h-screen w-screen justify-center items-center fixed top-0"
      onClick={(e) => dismissHandler(e.target as HTMLDivElement)}
      style={{ backgroundColor: '#000000aa' }}
    >
      <form
        action=""
        className="flex flex-col bg-white max-w-md my-20 rounded-xl px-10 py-10 gap-y-5 font-body"
        style={{ width: '100%' }}
      >
        <input
          className="border-2 border-zomp rounded-md text-sm px-3 py-2"
          type="text"
          name="sender"
          placeholder="Name"
        />
        <input
          className="border-2 border-queenBlue rounded-md text-sm px-3 py-2"
          type="email"
          name="email"
          placeholder="Email"
        />
        <textarea
          className="border-2 border-maizeCrayola rounded-md text-sm px-3 py-2"
          name="message"
          cols={30}
          rows={10}
          placeholder="Message"
        ></textarea>
        <Button text="Send"></Button>
      </form>
    </div>
  ) : (
    <></>
  )
}
