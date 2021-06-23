import Link from 'next/link'
import { colors as clrs } from '../Theme'

export default function Masthead({}) {
  const logo = 'kevinotuteye'
  const colors = Object.keys(clrs)

  return (
    <Link href="/" passHref>
      <h1 className="font-heading text-2xl font-bold  cursor-pointer">
        {logo.split('').map((x, i) => (
          <span
            key={i}
            className={`text-${colors[i % colors.length]} md:text-white md:bg-${
              colors[i % colors.length]
            }  px-1 md:px-2 py-1`}
          >
            {x}
          </span>
        ))}
      </h1>
    </Link>
  )
}
