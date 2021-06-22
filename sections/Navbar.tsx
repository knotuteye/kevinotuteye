import Button from '../components/Button'
import Masthead from '../components/Masthead'
import { theme } from '../tailwind.config'
export default function Navbar() {
  const colors = Object.keys(theme.colors).filter((x) => !['white'])
  const navButtons = [
    {
      text: 'Blog',
      onClick: () => {},
    },
    {
      text: 'Work',
      onClick: () => {},
    },
    {
      text: 'Say Hi',
      onClick: () => {},
      alt: true,
    },
  ]
  return (
    <div className="flex items-center px-20 py-5 ">
      <div>
        <Masthead></Masthead>
      </div>
      <div className="flex flex-1 gap-x-5 justify-end font-body">
        {navButtons.map((btn, i) => (
          <Button
            text={btn.text}
            alt={btn.alt}
            onClick={btn.onClick}
            key={btn.text}
          ></Button>
        ))}
      </div>
    </div>
  )
}
