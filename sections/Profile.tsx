import Image from 'next/image'

export default function Profile({}) {
  const profilePic = require('/public/img/profile.jpg')
  return (
    <div id="profile" className="flex flex-col justify-center items-center">
      <div
        className="flex my-20 rounded-full border-4 border-pistachio"
        style={{ height: '20rem', width: '20rem' }}
      >
        <Image src={profilePic} className="rounded-full"></Image>
      </div>
      <div className="flex flex-col gap-y-3 text-2xl max-w-xl font-body text-center text-queenBlue">
        <span>
          Hi there, I'm <span className=" text-maizeCrayola font-bold">Kevin Otuteye.</span>
        </span>
        <span>
          I create beautiful digital experiences from web to desktop to mobile.
        </span>
        <span>When I'm not writing code, I'm making music.</span>
      </div>
    </div>
  )
}
