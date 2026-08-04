import { useProgress } from '@react-three/drei'
import { useEffect, useState } from 'react'
import { isWorldReady, setWorldReady } from '../lib/loading'

/**
 * The curtain.
 *
 * Everything the site loads — five car GLBs, the draco decoder, two fonts —
 * goes through three's DefaultLoadingManager, which drei's `useProgress`
 * reports on. Before this existed the canvas' Suspense fallback was `null`, so
 * the first couple of seconds were a flat orange field with nothing on it and
 * no indication anything was coming.
 *
 * It lives in the DOM rather than as a Suspense fallback inside the canvas
 * because a fallback unmounts the moment the boundary resolves, which is
 * exactly one frame before the world is worth looking at. This one holds until
 * the bar is full, then gets out of the way on its own schedule and tells the
 * reveal to start as it goes.
 */

/** Long enough to read as a deliberate hand-off, short enough not to be a wait. */
const FADE_MS = 700

/**
 * The bar never jumps backwards.
 *
 * `useProgress` reports items as the manager learns about them, so loading a
 * font partway through a run of GLBs genuinely lowers the percentage. That is
 * accurate and it looks broken, so the displayed value is a high-water mark.
 */
function useMonotonicProgress(): number {
  const { progress } = useProgress()
  const [peak, setPeak] = useState(0)

  // Adjusting state during render rather than in an effect: React's documented
  // pattern for deriving from a changing input, and the one that does not show
  // a stale frame at the old value first.
  if (progress > peak) setPeak(progress)

  return Math.max(peak, progress)
}

export default function Loader() {
  const progress = useMonotonicProgress()
  // A visitor arriving from another route has already seen this; `isWorldReady`
  // is module state and stays true, so the curtain never goes back up.
  const [dismissed, setDismissed] = useState(isWorldReady)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    if (dismissed || progress < 100) return

    /**
     * One frame of grace before the fade.
     *
     * `progress` hits 100 when the last file lands, not when the scene built
     * from it has been rendered. Lifting on the same tick shows a frame of
     * empty floor. A rAF is the smallest possible wait that guarantees the
     * first real frame is on screen underneath.
     */
    const frame = requestAnimationFrame(() => {
      setClearing(true)
      setWorldReady()
    })

    return () => cancelAnimationFrame(frame)
  }, [progress, dismissed])

  useEffect(() => {
    if (!clearing) return
    const id = window.setTimeout(() => setDismissed(true), FADE_MS)
    return () => window.clearTimeout(id)
  }, [clearing])

  if (dismissed) return null

  return (
    <div
      // aria-hidden because the DOM content layer underneath is the real,
      // readable page — a screen reader should be in that, not in a progress
      // bar for a decoration it is not going to see.
      aria-hidden
      className="fixed inset-0 z-30 grid place-items-center bg-orangeRed transition-opacity ease-out"
      style={{
        opacity: clearing ? 0 : 1,
        transitionDuration: `${FADE_MS}ms`,
        // Stops the curtain eating the first click or key press of a visitor
        // who is already reaching for the controls as it clears.
        pointerEvents: clearing ? 'none' : 'auto',
      }}
    >
      <div className="flex w-64 flex-col items-center gap-5">
        <p className="font-heading text-sm uppercase tracking-[0.4em] text-white">
          Kevin Otuteye
        </p>

        <div className="h-px w-full overflow-hidden bg-white/25">
          <div
            className="h-full bg-white transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="font-heading text-[0.6rem] uppercase tracking-[0.3em] text-white/70">
          {progress < 100 ? 'Loading' : 'Ready'}
        </p>
      </div>
    </div>
  )
}
