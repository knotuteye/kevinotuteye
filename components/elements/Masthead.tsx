import Link from 'next/link'
import { Fragment } from 'react'
import { paletteNameAt } from '../../lib/palette'

export default function Masthead() {
  const logo = 'kevinotuteye'

  return (
    <Link href="/">
      <h1 className="font-heading text-2xl font-bold cursor-pointer">
        {logo.split('').map((x, i) => {
          const color = paletteNameAt(i)
          return (
            <Fragment key={i}>
              <span className={`md:hidden text-${color} px-1 py-1`}>{x}</span>
              <span
                className={`hidden md:inline text-white bg-${color} px-1 py-1`}
              >
                {x}
              </span>
            </Fragment>
          )
        })}
      </h1>
    </Link>
  )
}
