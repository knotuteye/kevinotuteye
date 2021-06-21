import Image from 'next/image'

export default function Profile({}) {
  return (
    <div id="profile" className="flex justify-center items-center" style={{}}>
      <div
        className="flex my-20 rounded-full"
        style={{ height: '20rem', width: '19rem' }}
      >
        <Image
          src={require('/public/img/profile.jpg')}
          className="rounded-full"
        ></Image>
      </div>
      <div>
        
      </div>
    </div>
  )
}
