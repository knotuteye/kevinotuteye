export default function Profile({}) {
  return (
    <div id="profile" className="flex flex-col justify-center items-center">
      <div
        className="flex mt-16 mb-12 rounded-full border-4 border-pistachio bg-maizeCrayola shadow-lg"
        style={{
          height: '15rem',
          width: '15rem',
          backgroundImage: 'url(/img/profile.png)',
          backgroundPosition: 'center bottom',
          backgroundSize: '83%',
          backgroundRepeat: 'no-repeat',
        }}
      ></div>
      <div className="flex flex-col gap-y-3 text-2xl max-w-lg font-heading text-center text-queenBlue">
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
      <div className="flex my-14 gap-x-12">
        <a href="https://www.github.com/knotuteye">
          <svg
            role="img"
            className="h-12 w-12"
            viewBox="0 0 24 24"
            fill="#181717"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>GitHub</title>
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
        </a>
        <a href="https://www.gitlab.com/kevinotuteye">
          <svg
            role="img"
            className="h-12 w-12"
            viewBox="0 0 24 24"
            fill="#FCA121"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>GitLab</title>
            <path d="M4.845.904c-.435 0-.82.28-.955.692C2.639 5.449 1.246 9.728.07 13.335a1.437 1.437 0 00.522 1.607l11.071 8.045c.2.145.472.144.67-.004l11.073-8.04a1.436 1.436 0 00.522-1.61c-1.285-3.942-2.683-8.256-3.817-11.746a1.004 1.004 0 00-.957-.684.987.987 0 00-.949.69l-2.405 7.408H8.203l-2.41-7.408a.987.987 0 00-.942-.69h-.006zm-.006 1.42l2.173 6.678H2.675zm14.326 0l2.168 6.678h-4.341zm-10.593 7.81h6.862c-1.142 3.52-2.288 7.04-3.434 10.559L8.572 10.135zm-5.514.005h4.321l3.086 9.5zm13.567 0h4.325c-2.467 3.17-4.95 6.328-7.411 9.502 1.028-3.167 2.059-6.334 3.086-9.502zM2.1 10.762l6.977 8.947-7.817-5.682a.305.305 0 01-.112-.341zm19.798 0l.952 2.922a.305.305 0 01-.11.341v.002l-7.82 5.68.026-.035z" />
          </svg>
        </a>
        <a href="https://www.linkedin.com/in/kevinotuteye/">
          <svg
            role="img"
            className="h-12 w-12"
            viewBox="0 0 24 24"
            fill="#0A66C2"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>LinkedIn</title>
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </a>
      </div>
    </div>
  )
}
