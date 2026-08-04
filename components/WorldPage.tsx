import dynamic from 'next/dynamic'
import { useEffect, type ReactNode } from 'react'
import { useCapabilities } from '../lib/capabilities'
import type { ZoneId } from '../lib/world'
import DriveControls from './DriveControls'
import Loader from './Loader'

// three must never run during SSR.
const WorldCanvas = dynamic(() => import('./three/WorldCanvas'), { ssr: false })

/**
 * Every route renders its real content as DOM on the server, then the 3D world
 * mounts over it on the client if the device can take it.
 *
 * One mechanism doing three jobs: crawlers and no-JS visitors get real HTML,
 * reduced-motion and low-power devices get a working site, and there is no
 * separate fallback build to keep in sync — the DOM layer *is* the content.
 */
export default function WorldPage({
  entry,
  children,
}: {
  entry: ZoneId
  children: ReactNode
}) {
  const caps = useCapabilities()
  const showWorld = caps.canRenderWorld

  // The world is a fixed viewport, not a document — without this the hidden
  // DOM layer keeps the page scrollable and leaves a scrollbar beside the canvas.
  useEffect(() => {
    if (!showWorld) return
    const { style } = document.documentElement
    const previous = style.overflow
    style.overflow = 'hidden'
    return () => {
      style.overflow = previous
    }
  }, [showWorld])

  return (
    <>
      <div
        aria-hidden={showWorld || undefined}
        className={
          showWorld
            ? 'pointer-events-none absolute inset-0 select-none opacity-0'
            : undefined
        }
      >
        {children}
      </div>

      {showWorld ? (
        <>
          <WorldCanvas entry={entry} postProcessing={!caps.lowPower} />
          <DriveControls />
          {/* Above the canvas and above the controls — it is the only thing on
              screen until the world is worth showing. */}
          <Loader />
        </>
      ) : null}
    </>
  )
}
