import { useEffect, useMemo, useSyncExternalStore, type CSSProperties } from 'react'
import {
  endIntro,
  getLoomPhase,
  getServerLoomPhase,
  introMs,
  subscribeLoom,
} from '../lib/loom'
import {
  cellBackground,
  cellThread,
  stripWarmth,
  weaveModel,
} from '../lib/weave'

const STRIPS = 20
const ROWS = 24
const UNIT = 36

/**
 * The full-screen cloth used for the first-load intro and every page change.
 *
 * Rendered on the server already covering the screen, with a CSS animation
 * that lifts it. So the intro plays without JavaScript, and a visitor never
 * sees a flash of unstyled page before it. Strips past what the viewport needs
 * are hidden by CSS, so phones run 8 strips and desktops 20.
 */
export default function Loom() {
  const phase = useSyncExternalStore(subscribeLoom, getLoomPhase, getServerLoomPhase)
  const cloth = useMemo(() => weaveModel(STRIPS, ROWS, 2026), [])

  useEffect(() => {
    const timer = setTimeout(endIntro, introMs() + 60)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="loom" data-phase={phase} aria-hidden="true">
      {cloth.map((strip, i) => {
        const warmth = stripWarmth(i, STRIPS, 0.05, 0.95)
        const fromTop = i % 2 === 1
        const style = {
          '--i': i,
          '--from': fromTop ? '-101%' : '101%',
          '--to': fromTop ? '101%' : '-101%',
          // Odd strips sit a unit higher (the half-block offset), so every
          // strip is a unit taller than the screen to keep the bottom covered.
          marginTop: fromTop ? -UNIT : 0,
          height: `calc(100% + ${UNIT}px)`,
        } as CSSProperties
        return (
          <div key={i} className="loom-strip" style={style}>
            {strip.map((cell, j) => (
              <div
                key={j}
                style={{
                  height: cell.units * UNIT,
                  flex: 'none',
                  background: cellBackground(cell.kind, cellThread(cell, warmth)),
                }}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
