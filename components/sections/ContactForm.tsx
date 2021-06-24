import { Dispatch, SetStateAction } from 'react'

import { colors as clrs } from '../../Theme'

import Button from '../elements/Button'
type Props = {
  show: boolean
  setShow: Dispatch<SetStateAction<boolean>>
}
export default function ContactForm({ show, setShow }: Props) {
  const colors = Object.keys(clrs)

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
      style={{ backgroundColor: '#000000bc' }}
    >
      <div className="flex flex-col">
        <div className="flex w-full h-36">
          {colors.map((x) => (
            <div key={x} className={`flex flex-1 bg-${x}`}></div>
          ))}
          <div
            className="cursor-pointer text-white absolute right-2 top-2 md:right-5 md:top-5"
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
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <div
          className="flex flex-col bg-white max-w-md px-10 py-10 gap-y-5 font-body"
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
                className="h-5 w-5 transform rotate-90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            }
          ></Button>
        </div>
      </div>
    </div>
  ) : (
    <></>
  )
}
