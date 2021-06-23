import Link from 'next/link'
import { theme } from '../tailwind.config'

export default function Masthead({}) {
  const logo = 'kevinotuteye'
  const colors = Object.keys(theme.colors).filter((x) => !['white'].includes(x))

  return (
    <Link href="/">
      <h1 className="font-heading text-2xl font-bold text-white cursor-pointer">
        {logo.split('').map((x, i) => (
          <span key={i} className={`bg-${colors[i % colors.length]} px-1 md:px-2 py-1`}>
            {x}
          </span>
        ))}
      </h1>
    </Link>
  )
}
