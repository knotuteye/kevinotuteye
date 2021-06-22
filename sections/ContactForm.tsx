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

  function sendMessage() {
    return setShow(false)
  }

  return show ? (
    <div
      id="backdrop"
      className="flex shadow-lg h-screen w-screen justify-center items-center fixed top-0"
      onClick={(e) => dismissHandler(e.target as HTMLDivElement)}
      style={{ backgroundColor: '#000000aa' }}
    >
      <div
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
          className="border-2 resize-none border-maizeCrayola rounded-md text-sm px-3 py-2"
          name="message"
          cols={30}
          rows={6}
          placeholder="Message"
        ></textarea>
        <Button
          text="Send"
          onClick={sendMessage}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 transform rotate-90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          }
        ></Button>
      </div>
    </div>
  ) : (
    <></>
  )
}
