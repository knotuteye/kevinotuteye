import { useEffect, useRef } from 'react'
import { compassMarkers, compassState } from '../lib/compass'
import { useWorldReady } from '../lib/loading'

/**
 * Chevrons pinned to the edge of the screen, one per zone you cannot see.
 *
 * The reasoning for why this exists is in `lib/compass`; this is the surface.
 * It reads the projected positions the canvas wrote on the last frame and moves
 * four elements, in a rAF loop that never touches React — the same trade the
 * joystick knob makes, and for the same reason: a re-render per frame to nudge
 * a chip a few pixels is a frame's worth of React for a chip.
 *
 * It sits in the DOM rather than in the scene because the whole point is to
 * describe things that are *outside* the frame, and an object in the scene that
 * is off screen is exactly the problem rather than the solution.
 */

/** Keeps a chip clear of the rounded corners and the chrome in them. */
const MARGIN = 56

type Row = {
  wrapper: HTMLDivElement
  arrow: HTMLSpanElement
  distance: HTMLSpanElement
  /** Last written values, so styles and text are only touched on change. */
  shown: number
  opacity: number
}

export default function Compass() {
  const host = useRef<HTMLDivElement>(null)
  const ready = useWorldReady()

  useEffect(() => {
    if (!ready) return
    const node = host.current
    if (!node) return

    const rows: Row[] = compassMarkers.map((marker) => {
      const wrapper = node.querySelector<HTMLDivElement>(
        `[data-compass="${marker.id}"]`
      )!
      return {
        wrapper,
        arrow: wrapper.querySelector<HTMLSpanElement>('[data-arrow]')!,
        distance: wrapper.querySelector<HTMLSpanElement>('[data-distance]')!,
        shown: -1,
        opacity: -1,
      }
    })

    let frame = 0

    const tick = () => {
      frame = requestAnimationFrame(tick)

      const width = window.innerWidth
      const height = window.innerHeight

      for (let i = 0; i < compassMarkers.length; i++) {
        const marker = compassMarkers[i]
        const row = rows[i]

        const show = marker.live && !marker.onScreen
        const opacity = show ? compassState.strength : 0

        // Gated so an unchanged value is not rewritten every frame — which
        // matters because the element carries a CSS transition, and rewriting
        // the same number is free while rewriting a different one is not.
        if (Math.abs(opacity - row.opacity) > 0.02) {
          row.opacity = opacity
          row.wrapper.style.opacity = opacity.toFixed(2)
        }

        // Kept in the layout rather than display:none'd: a chip that comes back
        // should not cost a reflow at the exact moment the camera is moving.
        if (opacity < 0.02) continue

        /**
         * The direction, pushed out to the boundary of the viewport rectangle.
         *
         * Scaling the unit vector by whichever axis reaches an edge first is
         * what puts a chip on the *side* nearest its zone rather than on a
         * circle inscribed in the screen — on a wide monitor a circle leaves
         * the left and right thirds empty, which is where most of this map is.
         */
        const length = Math.hypot(marker.x, marker.y) || 1
        const nx = marker.x / length
        const ny = marker.y / length
        const scale = Math.min(
          1 / Math.max(Math.abs(nx), 1e-6),
          1 / Math.max(Math.abs(ny), 1e-6)
        )
        const ex = nx * scale
        const ey = ny * scale

        const px = (ex * 0.5 + 0.5) * (width - MARGIN * 2) + MARGIN
        const py = (-ey * 0.5 + 0.5) * (height - MARGIN * 2) + MARGIN

        row.wrapper.style.transform = `translate3d(${Math.round(px)}px, ${Math.round(py)}px, 0) translate(-50%, -50%)`

        // Screen y runs down and the bearing is in NDC, so the angle is negated
        // to keep the arrow pointing at the zone rather than mirrored about it.
        row.arrow.style.transform = `rotate(${Math.atan2(-ny, nx) * (180 / Math.PI) + 90}deg)`

        const metres = Math.round(marker.distance)
        if (metres !== row.shown) {
          row.shown = metres
          row.distance.textContent = `${metres}m`
        }
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [ready])

  return (
    <div ref={host} className="pointer-events-none fixed inset-0 z-20">
      {compassMarkers.map((marker) => (
        <div
          key={marker.id}
          data-compass={marker.id}
          className="absolute left-0 top-0 flex flex-col items-center gap-0.5 opacity-0 drop-shadow transition-opacity duration-200"
        >
          <span
            data-arrow
            className="block font-heading text-sm leading-none text-white/90"
          >
            ▲
          </span>
          <span className="font-heading text-[0.6rem] uppercase leading-none tracking-[0.2em] text-white">
            {marker.label}
          </span>
          <span
            data-distance
            className="font-heading text-[0.55rem] leading-none tracking-[0.15em] text-white/60"
          />
        </div>
      ))}
    </div>
  )
}
