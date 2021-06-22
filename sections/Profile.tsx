export default function Profile({}) {
  return (
    <div id="profile" className="flex flex-col justify-center items-center">
      <div
        className="flex mt-20 mb-12 rounded-full border-4 border-pistachio bg-maizeCrayola shadow-lg"
        style={{
          height: '20rem',
          width: '20rem',
          backgroundImage: 'url(/img/profile.png)',
          backgroundPosition: 'center bottom',
          backgroundSize: '83%',
          backgroundRepeat: 'no-repeat',
        }}
      ></div>
      <div className="flex flex-col gap-y-3 text-2xl max-w-xl font-body text-center text-queenBlue">
        <p>
          Hi there, I'm{' '}
          <span className=" text-redSalsa font-bold">Kevin Otuteye.</span>
        </p>
        <p>
          I create beautiful digital experiences on the
          <span className="font-bold text-orangeRed"> web,</span>{' '}
          <span className="font-bold text-yellowOrange"> mobile</span> and{' '}
          <span className="font-bold text-maizeCrayola">desktop.</span>
        </p>
        <p>
          When I'm not writing{' '}
          <span className="font-bold text-pistachio">code</span> , I'm making{' '}
          <span className="font-bold text-zomp">music.</span>
        </p>
      </div>
    </div>
  )
}
