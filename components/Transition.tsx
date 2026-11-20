import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { ENDS, compileCloth, PATTERNS } from '../lib/kente'
import { clothPatterns } from '../lib/content'
import { easeInOut } from '../lib/motion'
import { thud } from '../lib/sound'
import {
  getPhase,
  getServerPhase,
  phaseStart,
  stripCount,
  subscribePhase,
  TIMING,
} from '../lib/transition'
import { createClothRenderer, DEFAULT_PARAMS, type ClothParams, type ClothRenderer } from './cloth/engine'

/**
 * The page change, drawn as the cloth itself: every chapter's strip drops in
 * from alternate ends, locks edge to edge over the old page, then carries on
 * through to show the new one. Without WebGL it falls back to plain strips.
 */
export default function Transition() {
  const phase = useSyncExternalStore(subscribePhase, getPhase, getServerPhase)
  const canvas = useRef<HTMLCanvasElement>(null)
  const renderer = useRef<ClothRenderer | null>(null)
  const [fallback, setFallback] = useState(false)
  const cloth = useMemo(() => compileCloth(clothPatterns.map((id) => PATTERNS[id])), [])

  // Create the context lazily, on the first page change.
  useEffect(() => {
    if (phase === 'idle' || renderer.current || fallback) return
    const cv = canvas.current
    if (!cv) return
    renderer.current = createClothRenderer(cv, cloth, { maxDpr: 1.5 })
    if (!renderer.current) setFallback(true)
  }, [phase, cloth, fallback])

  useEffect(() => () => renderer.current?.destroy(), [])

  useEffect(() => {
    const r = renderer.current
    if (!r || phase === 'idle') return
    r.resize()
    let raf = 0
    let landed = 0
    const n = stripCount()
    const total = clothPatterns.length
    // Show the middle of the career on narrow screens, all of it on wide ones.
    const first = Math.max(0, Math.floor((total - n) / 2))
    const params: ClothParams = structuredClone(DEFAULT_PARAMS)
    const start = phaseStart()

    const draw = (now: number) => {
      const { width, height } = r.size()
      const scale = width / (n * ENDS)
      const half = height / scale / 2
      params.cam = { x: (first + n / 2) * ENDS, y: 0, scale }
      params.light = { x: width * 0.7, y: height * 0.2, z: 700 }
      params.drape = 0.6
      params.time = now / 1000
      params.seam = 0
      let done = true
      params.strips = Array.from({ length: total }, (_, k) => {
        const i = k - first
        const t = Math.min(1, Math.max(0, (now - start - Math.max(0, i) * TIMING.stagger) / TIMING.duration))
        if (t < 1) done = false
        const e = easeInOut(t)
        const fromTop = k % 2 === 1
        const travel = half * 2 + 24
        const sign = fromTop ? -1 : 1
        const slide = phase === 'cover' ? sign * travel * (1 - e) : -sign * travel * e
        if (phase === 'cover' && t >= 1 && i >= 0 && i < n && landed <= i) {
          landed = i + 1
          thud(0.6)
        }
        return { slide, top: -half - 2, bottom: half + 2, warp: 0 }
      })
      r.render(params)
      if (!done || phase === 'cover') raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  const n = typeof window === 'undefined' ? 8 : stripCount()

  return (
    <div className="transition-cloth" data-active={phase !== 'idle'} aria-hidden="true">
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" style={{ display: fallback ? 'none' : undefined }} />
      {fallback ? (
        <div className="transition-strips">
          {Array.from({ length: n }, (_, i) => (
            <span
              key={i}
              style={
                {
                  '--i': i,
                  '--y': phase === 'cover' ? '0%' : phase === 'reveal' ? (i % 2 ? '101%' : '-101%') : i % 2 ? '-101%' : '101%',
                } as CSSProperties
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
