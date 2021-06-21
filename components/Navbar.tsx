import Button from './Button'
import Masthead from './Masthead'

export default function Navbar() {
  return (
    <div className="flex items-center px-20 py-3 ">
      <div>
        <Masthead></Masthead>
      </div>
      <div className="flex flex-1 gap-x-5 justify-end font-body">
        <Button text="Blog" onClick={() => {}}></Button>
        <Button text="Work" onClick={() => {}}></Button>
        <Button text="Say Hi" onClick={() => {}} alt></Button>
      </div>
    </div>
  )
}
