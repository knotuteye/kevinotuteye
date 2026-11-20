import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { chapters, route } from '../../lib/content'
import { isLand, MAP, project } from '../../lib/map'
import { range } from '../../lib/motion'
import { getServerTheme, getTheme, subscribeTheme, themeColor } from '../../lib/theme'
import { useScrollProgress } from '../../lib/useScrollProgress'
import { Reveal, Woven } from '../Reveal'

const VIEW_W = 1000
const VIEW_H = Math.round(VIEW_W / MAP.aspect)

/** Label placement per city, so close neighbours do not collide. */
const LABELS: Record<string, { dx: number; dy: number; anchor: 'start' | 'end' }> = {
  Accra: { dx: 16, dy: 24, anchor: 'start' },
  Kumasi: { dx: -16, dy: -12, anchor: 'end' },
  Charlotte: { dx: -16, dy: 22, anchor: 'end' },
  Boston: { dx: 14, dy: -14, anchor: 'start' },
  Auckland: { dx: 16, dy: -12, anchor: 'start' },
}

/** The route as screen geometry. It never changes, so it is worked out once. */
const points = route.map(({ place }) => {
  const [x, y] = project(place.lon, place.lat)
  return { x: x * VIEW_W, y: y * VIEW_H }
})
// Each leg is a quadratic arc that lifts with distance, like a thread pulled taut.
const legs = points.slice(1).map((p, i) => {
  const a = points[i]
  const dist = Math.hypot(p.x - a.x, p.y - a.y)
  return { a, c: { x: (a.x + p.x) / 2, y: (a.y + p.y) / 2 - Math.min(160, dist * 0.32) }, b: p }
})
const d = points.length
  ? `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} ` +
    legs.map(({ c, b }) => `Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`).join(' ')
  : ''
// How far along the whole thread each city sits, so a city lights up the
// moment the thread reaches it rather than at an even step.
const reach = (() => {
  const lengths = legs.map(({ a, c, b }) => {
    let len = 0
    let prev = a
    for (let k = 1; k <= 24; k++) {
      const t = k / 24
      const q = {
        x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
        y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
      }
      len += Math.hypot(q.x - prev.x, q.y - prev.y)
      prev = q
    }
    return len
  })
  const total = lengths.reduce((x, y) => x + y, 0) || 1
  let run = 0
  return [0, ...lengths.map((l) => (run += l) / total)]
})()

/**
 * The route, drawn as one thread across the world. Land is a field of short
 * weft-like dashes from Natural Earth (public domain); the thread runs
 * through every city the work has come from, in order, as you scroll.
 *
 * The thread is timed against the map itself, not the whole section, so it
 * reaches the last city while the map is still fully on screen.
 */
export default function Route() {
  const sheet = useRef<HTMLDivElement>(null)
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getServerTheme)
  const canvas = useRef<HTMLCanvasElement>(null)
  const thread = useRef<SVGPathElement>(null)
  const dots = useRef<(SVGGElement | null)[]>([])

  // Land, drawn once per size.
  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = cv.clientWidth
      const h = cv.clientHeight
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      const ctx = cv.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)
      const light = getTheme() === 'light'
      const gold = themeColor('accent', light ? 0.45 : 0.34)
      const blue = themeColor('accent2', light ? 0.35 : 0.3)
      const plain = themeColor('fg', light ? 0.22 : 0.2)
      const cw = w / MAP.cols
      const ch = h / MAP.rows
      for (let r = 0; r < MAP.rows; r++) {
        for (let c = 0; c < MAP.cols; c++) {
          if (!isLand(c, r)) continue
          // Warm toward Ghana, cool toward the Americas: the cloth's own gradient.
          const t = c / MAP.cols
          ctx.fillStyle = t > 0.62 ? gold : t > 0.38 ? blue : plain
          ctx.fillRect(c * cw + cw * 0.15, r * ch + ch * 0.38, cw * 0.7, Math.max(1, ch * 0.26))
        }
      }
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(cv)
    return () => ro.disconnect()
  }, [theme])

  const onProgress = useCallback((p: number) => {
    const path = thread.current
    if (!path) return
    const len = path.getTotalLength()
    // p is 0 as the map's top enters and 1 as its bottom leaves. The whole
    // map is in view from about 0.4; the thread is home by 0.42.
    const t = range(p, 0.12, 0.42)
    path.style.strokeDasharray = `${len}`
    path.style.strokeDashoffset = `${len * (1 - t)}`
    dots.current.forEach((g, i) => {
      if (!g) return
      const on = t >= (reach[i] ?? 1) - 0.002
      g.style.opacity = on ? '1' : '0.25'
    })
  }, [])
  useScrollProgress(sheet, onProgress)

  return (
    <section aria-labelledby="route" className="relative overflow-hidden border-t border-seam py-28 md:py-40">
      <div className="gutter mx-auto grid max-w-page gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,440px)] md:items-end">
        <Woven
          id="route"
          className="t-display text-[clamp(64px,9vw,168px)]"
          lines={['The thread', [{ text: 'travels', italic: true, className: 'text-accent' }]]}
        />
        <Reveal as="p" className="t-lede text-soft">
          {chapters.length} roles, {route.length} cities, three continents. Most of the work was remote, so these
          are the places it came from, not a list of addresses.
        </Reveal>
      </div>

      <div ref={sheet} className="relative mx-auto mt-16 max-w-[1280px] md:mt-24" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}>
        <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 h-full w-full" />
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="thread" x1="1" x2="0" y1="0" y2="0">
              <stop offset="0" className="[stop-color:rgb(var(--c-accent))]" />
              <stop offset="0.6" className="[stop-color:rgb(var(--c-accent))]" />
              <stop offset="1" className="[stop-color:rgb(var(--c-accent2))]" />
            </linearGradient>
          </defs>
          <path d={d} fill="none" className="stroke-fg/20" strokeWidth={1} strokeDasharray="2 4" />
          <path ref={thread} d={d} fill="none" stroke="url(#thread)" strokeWidth={2.2} strokeLinecap="round" />
          {points.map((p, i) => {
            const { place, year } = route[i]
            const right = p.x < VIEW_W * 0.7
            const label = LABELS[place.city] ?? { dx: right ? 14 : -14, dy: -14, anchor: right ? 'start' : 'end' }
            return (
              <g
                key={place.city}
                ref={(node) => {
                  dots.current[i] = node
                }}
                style={{ transition: 'opacity 600ms ease' }}
              >
                <circle cx={p.x} cy={p.y} r={9} fill="none" className="stroke-accent/40" />
                <circle cx={p.x} cy={p.y} r={3.2} className="fill-fg" />
                <text
                  x={p.x + label.dx}
                  y={p.y + label.dy}
                  textAnchor={label.anchor}
                  className="fill-fg font-serif"
                  style={{ fontSize: 22 }}
                >
                  {place.city}
                </text>
                <text
                  x={p.x + label.dx}
                  y={p.y + label.dy + 16}
                  textAnchor={label.anchor}
                  className="fill-muted font-mono"
                  style={{ fontSize: 10, letterSpacing: '0.12em' }}
                >
                  {year}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <ol className="gutter mx-auto mt-16 grid max-w-page gap-x-8 sm:grid-cols-2 lg:grid-cols-5">
        {route.map(({ place, year }, i) => (
          <Reveal as="li" key={place.city} delay={i * 70} className="border-t border-seam pb-8 pt-5">
            <span className={`t-label block ${i < route.length / 2 ? 'text-accent' : 'text-accent2'}`}>
              {year} · {place.country}
            </span>
            <span className="t-title mt-3 block text-[40px]">{place.city}</span>
            <span className="t-label mt-3 block text-muted">{place.coords}</span>
          </Reveal>
        ))}
      </ol>
    </section>
  )
}
