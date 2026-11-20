import { useEffect, useMemo, useRef, useState } from 'react'
import {
  cellBackground,
  cellThread,
  stripOffsetUnits,
  stripWarmth,
  weaveModel,
} from '../../lib/weave'
import { createWeaveRenderer, type WeaveRenderer } from './gl'

type Props = {
  /** Number of strips across. Strips share the width equally. */
  strips: number
  /** Cells per strip; a multiple of 6. Enough to cover the tallest layout. */
  rows?: number
  seed: number
  /** Warmth of the first and last strip: 0 is Kumasi gold, 1 is Boston indigo. */
  from?: number
  to?: number
  /** Height of one unit in px. Warp bands are 3 units, blocks 2. */
  unit?: number
  /** How far scrolling past the weave shifts it toward indigo. 0 disables. */
  scrollShift?: number
  /** Strips slide under the pointer, like pulling a thread. */
  interactive?: boolean
  className?: string
}

const GAP = 2

/**
 * A panel of woven cloth.
 *
 * The server renders it as CSS: real HTML, correct on first paint, and the
 * fallback when WebGL is missing. On the client a canvas draws the same cells
 * over it, and the CSS layer is hidden once the first frame lands, so the swap
 * is invisible. Purely decorative, so the whole thing is aria-hidden.
 */
export default function Weave({
  strips,
  rows = 24,
  seed,
  from = 0,
  to = 1,
  unit = 40,
  scrollShift = 0,
  interactive = false,
  className = '',
}: Props) {
  const cloth = useMemo(() => weaveModel(strips, rows, seed), [strips, rows, seed])
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [drawn, setDrawn] = useState(false)

  // The canvas only earns its context when the cloth moves. Static bands stay
  // as CSS, which also keeps a long page well under the browser's WebGL limit.
  const animated = interactive || scrollShift !== 0

  useEffect(() => {
    const el = root.current
    const cv = canvas.current
    if (!el || !cv || !animated) return

    let renderer: WeaveRenderer | null = null
    try {
      renderer = createWeaveRenderer(cv, cloth, { from, to, unit, gap: GAP }, () =>
        setDrawn(true)
      )
    } catch {
      renderer = null
    }
    if (!renderer) return
    const r = renderer

    const resizeObserver = new ResizeObserver(() => r.resize())
    resizeObserver.observe(cv)

    // Scroll recolouring, only while the panel is on screen.
    let visible = false
    let ticking = false
    const update = () => {
      ticking = false
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      const progress = (vh - rect.top) / (vh + rect.height)
      r.setShift((Math.min(1, Math.max(0, progress)) - 0.5) * scrollShift)
    }
    const onScroll = () => {
      if (!visible || ticking) return
      ticking = true
      requestAnimationFrame(update)
    }
    const intersection = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) onScroll()
    })
    if (scrollShift) {
      intersection.observe(el)
      window.addEventListener('scroll', onScroll, { passive: true })
    }

    // Thread pull.
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const rect = el.getBoundingClientRect()
      const index = Math.floor(((event.clientX - rect.left) / rect.width) * strips)
      r.setPull(index, unit)
    }
    const onLeave = () => r.setPull(null, 0)
    if (interactive) {
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerleave', onLeave)
    }

    return () => {
      resizeObserver.disconnect()
      intersection.disconnect()
      window.removeEventListener('scroll', onScroll)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      r.destroy()
    }
  }, [cloth, from, to, unit, scrollShift, interactive, strips, animated])

  return (
    <div
      ref={root}
      aria-hidden="true"
      className={`relative overflow-hidden bg-ink ${className}`}
    >
      <div
        className="absolute inset-0 flex"
        style={{ gap: GAP, visibility: drawn ? 'hidden' : undefined }}
      >
        {cloth.map((strip, i) => {
          const warmth = stripWarmth(i, strips, from, to)
          return (
            <div
              key={i}
              className="flex min-w-0 flex-1 flex-col"
              style={{ marginTop: stripOffsetUnits(i) * unit }}
            >
              {strip.map((cell, j) => (
                <div
                  key={j}
                  className="flex-none"
                  style={{
                    height: cell.units * unit,
                    background: cellBackground(cell.kind, cellThread(cell, warmth)),
                  }}
                />
              ))}
            </div>
          )
        })}
      </div>
      {animated ? (
        <canvas
          ref={canvas}
          className="absolute inset-0 h-full w-full transition-opacity duration-500"
          style={{ opacity: drawn ? 1 : 0 }}
        />
      ) : null}
    </div>
  )
}
