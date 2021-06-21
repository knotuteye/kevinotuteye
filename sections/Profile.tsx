import Image from 'next/image'
export default function Profile({}) {
  return (
    <div id="profile" className="flex h-96 justify-center items-center">
      <div className="flex w-64 h-72 rounded-full">
        <Image
          src={require('/public/img/profile.jpg')}
          className="rounded-full"
        ></Image>
      </div>
    </div>
  )
}
