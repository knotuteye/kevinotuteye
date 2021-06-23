import Link from 'next/link'
import { colors as themeColors } from '../Theme'

export default function Masthead({}) {
  const logo = 'kevinotuteye'
  const colors = Object.keys(themeColors)

  return (
    <Link href="/" passHref>
      <h1 className="font-heading text-2xl font-bold  cursor-pointer">
        {logo.split('').map((x, i) => {
          let color = colors[i % colors.length]

          return (
            <span
              key={i}
              className={
                `text-${color} px-1 py-1 ` +
                `md:px-2 md:text-white md:bg-${color}`
              }
            >
              {x}
            </span>
          )
        })}
      </h1>
    </Link>
  )
}
