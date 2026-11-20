import NextLink from 'next/link'
import type { ComponentProps } from 'react'

/**
 * next/link with `scroll={false}`.
 *
 * Next scrolls to the top as soon as a route changes, which would jump the old
 * page while the loom is still dropping. _app scrolls instead, once the screen
 * is covered, so every internal link goes through here.
 */
export default function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink scroll={false} {...props} />
}
