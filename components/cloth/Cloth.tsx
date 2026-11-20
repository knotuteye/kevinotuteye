import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { compileCloth, PATTERNS, type PatternId } from '../../lib/kente'
import { prefersReducedMotion } from '../../lib/motion'
import {
  createClothRenderer,
  DEFAULT_PARAMS,
  type ClothParams,
  type ClothRenderer,
} from './engine'

export type FrameContext = {
  /** Seconds since the cloth started drawing. Frozen under reduced motion. */
  time: number
  dt: number
  width: number
  height: number
  /** Pointer in CSS px relative to the canvas, eased. */
  pointer: { x: number; y: number; inside: boolean; down: boolean }
  reduced: boolean
  /** The element the cloth is mounted in. */
  element: HTMLElement
}

/** Return `true` to keep animating. Return nothing to draw once and wait. */
export type FrameFn = (params: ClothParams, ctx: FrameContext) => boolean | void

type Props = {
  patterns: PatternId[]
  frame: FrameFn
  className?: string
  /** Shown until the first frame lands, and kept if WebGL2 is missing. */
  fallback?: ReactNode
  /** The press of the pointer dents the cloth. */
  pressable?: boolean
  maxDpr?: number
  /** Redraw when this changes even if the frame function is idle. */
  version?: unknown
}

/**
 * A canvas of woven cloth.
 *
 * The context is only created once the element nears the viewport, and the
 * loop only runs while it is on screen and the tab is visible. The cloth is
 * decorative and always aria-hidden: anything it says, the page says in text.
 */
export default function Cloth({
  patterns,
  frame,
  className = '',
  fallback = null,
  pressable = true,
  maxDpr = 2,
  version,
}: Props) {
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(frame)
  const kick = useRef<() => void>(() => {})
  const [drawn, setDrawn] = useState(false)
  const key = patterns.join(',')
  const cloth = useMemo(
    () => compileCloth(key.split(',').map((id) => PATTERNS[id as PatternId])),
    [key]
  )

  useEffect(() => {
    frameRef.current = frame
    kick.current()
  }, [frame, version])

  useEffect(() => {
    const el = root.current
    const cv = canvas.current
    if (!el || !cv) return

    let renderer: ClothRenderer | null = null
    let raf = 0
    let visible = false
    let started = 0
    let last = 0
    const reduced = prefersReducedMotion()
    const params: ClothParams = structuredClone(DEFAULT_PARAMS)
    // Adaptive resolution: if frames run long, draw fewer pixels.
    let dprCap = maxDpr
    let slow = 0
    let sampled = 0
    const pointer = { x: -1, y: -1, tx: -1, ty: -1, inside: false, down: false }
    let firstFrame = true

    const loop = (now: number) => {
      raf = 0
      if (!renderer || !visible || document.hidden) return
      if (!started) started = now
      const raw = last ? (now - last) / 1000 : 0.016
      const dt = Math.min(0.05, raw)
      last = now
      if (raw > 0 && raw < 0.2) {
        sampled++
        if (raw > 0.024) slow++
        if (sampled >= 40) {
          if (slow > 24 && dprCap > 1) {
            dprCap = Math.max(1, dprCap - 0.25)
            renderer.setMaxDpr(dprCap)
          }
          sampled = 0
          slow = 0
        }
      }
      const { width, height } = renderer.size()
      if (pointer.tx < 0) {
        pointer.tx = width * 0.62
        pointer.ty = height * 0.3
      }
      if (pointer.x < 0) {
        pointer.x = pointer.tx
        pointer.y = pointer.ty
      }
      const ease = 1 - Math.pow(0.0008, dt)
      pointer.x += (pointer.tx - pointer.x) * ease
      pointer.y += (pointer.ty - pointer.y) * ease
      const time = reduced ? 0 : (now - started) / 1000
      const ctx: FrameContext = {
        time,
        dt,
        width,
        height,
        pointer: { x: pointer.x, y: pointer.y, inside: pointer.inside, down: pointer.down },
        reduced,
        element: el,
      }
      params.time = time
      params.light.x = pointer.x
      params.light.y = pointer.y
      const target = pressable && pointer.inside && !reduced ? (pointer.down ? 1 : 0.45) : 0
      params.press.s += (target - params.press.s) * Math.min(1, dt * 6)
      params.press.x = pointer.x
      params.press.y = pointer.y
      const more = frameRef.current(params, ctx)
      renderer.render(params)
      if (firstFrame) {
        firstFrame = false
        setDrawn(true)
      }
      const settling = Math.abs(params.press.s - target) > 0.002
      const tracking = Math.abs(pointer.tx - pointer.x) + Math.abs(pointer.ty - pointer.y) > 0.5
      if (more || settling || tracking) request()
      else last = 0
    }
    const request = () => {
      if (!raf) raf = requestAnimationFrame(loop)
    }
    kick.current = request

    const start = () => {
      if (renderer) return
      try {
        renderer = createClothRenderer(cv, cloth, { maxDpr })
      } catch (error) {
        console.warn('[loom]', error)
        renderer = null
      }
      if (!renderer) return
      resizeObserver.observe(cv)
    }

    const resizeObserver = new ResizeObserver(() => {
      renderer?.resize()
      request()
    })

    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible) {
          start()
          request()
        }
      },
      { rootMargin: '25% 0px' }
    )
    intersection.observe(el)

    const onMove = (event: PointerEvent) => {
      const rect = cv.getBoundingClientRect()
      pointer.tx = event.clientX - rect.left
      pointer.ty = event.clientY - rect.top
      pointer.inside =
        event.pointerType === 'mouse' &&
        pointer.tx >= 0 &&
        pointer.ty >= 0 &&
        pointer.tx <= rect.width &&
        pointer.ty <= rect.height
      if (visible) request()
    }
    const onDown = () => {
      pointer.down = true
      request()
    }
    const onUp = () => {
      pointer.down = false
      request()
    }
    const onLeave = () => {
      pointer.inside = false
      request()
    }
    const onVisibility = () => {
      last = 0
      if (!document.hidden) request()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('scroll', request, { passive: true })

    return () => {
      if (raf) cancelAnimationFrame(raf)
      kick.current = () => {}
      intersection.disconnect()
      resizeObserver.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('scroll', request)
      renderer?.destroy()
      renderer = null
    }
  }, [cloth, maxDpr, pressable])

  return (
    <div
      ref={root}
      aria-hidden="true"
      className={/\b(absolute|fixed|sticky)\b/.test(className) ? className : `relative ${className}`}
    >
      {fallback ? (
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: drawn ? 0 : 1 }}
        >
          {fallback}
        </div>
      ) : null}
      <canvas
        ref={canvas}
        className="absolute inset-0 h-full w-full transition-opacity duration-700"
        style={{ opacity: drawn ? 1 : 0 }}
      />
    </div>
  )
}
