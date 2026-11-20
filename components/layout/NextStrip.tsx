import { useCallback, useRef } from 'react'
import { email } from '../../lib/content'
import { ENDS } from '../../lib/kente'
import { clamp, easeInOut, easeOut, lerp } from '../../lib/motion'
import { clack } from '../../lib/sound'
import Cloth, { type FrameFn } from '../cloth/Cloth'
import { Reveal, Woven } from '../Reveal'

/** Survives page changes, so the visitor's picks stay woven for the visit. */
const loom = { picks: 0, speed: 0, target: 0, lastPick: 0 }

/**
 * The close of every page: a new warp on the loom, strung and unwoven. Point
 * at the email address and the shuttle starts laying picks.
 */
export default function NextStrip() {
  const tally = useRef<HTMLSpanElement>(null)

  const frame = useCallback<FrameFn>((p, ctx) => {
    const { width: W, height: H } = ctx
    loom.speed += (loom.target - loom.speed) * clamp(ctx.dt * 3)
    if (!ctx.reduced) loom.picks += ctx.dt * loom.speed
    const woven = Math.floor(loom.picks + 0.1)
    if (woven !== loom.lastPick) {
      loom.lastPick = woven
      clack(0.6)
      if (tally.current) tally.current.textContent = String(woven).padStart(3, '0')
    }
    const scale = Math.min(W * 0.62, 380) / ENDS
    p.cam.scale = scale
    p.cam.x = ENDS / 2
    p.cam.y = (0.5 - 0.82) * (H / scale)
    p.drape = 0.35
    p.strips = [{ slide: loom.picks, top: -woven, bottom: 4 - loom.picks + woven * 0, warp: 400 }]
    const f = loom.picks - Math.floor(loom.picks)
    const idle = loom.speed < 0.05 && f < 0.02
    p.shuttle = { x: idle ? 0 : clamp(f / 0.7), dir: woven % 2 ? -1 : 1, visible: true }
    const swing = f < 0.74 ? 0 : f < 0.9 ? easeInOut((f - 0.74) / 0.16) : 1 - easeOut((f - 0.9) / 0.1)
    p.beat = lerp(8, 0.4, idle ? 0 : swing)
    return true
  }, [])

  const start = () => {
    loom.target = 2.4
  }
  const stop = () => {
    loom.target = 0
  }

  return (
    <section aria-labelledby="next-strip" className="relative overflow-hidden border-t border-seam">
      <div className="mx-auto grid max-w-page md:min-h-[92svh] md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="gutter relative z-10 flex flex-col justify-center gap-10 py-24">
          <Reveal as="p" className="t-label text-accent">
            Strip 09 · unwoven
          </Reveal>
          <Woven
            id="next-strip"
            className="t-display text-[clamp(64px,8.6vw,160px)]"
            lines={['The next strip', [{ text: 'is unwoven.', italic: true, className: 'text-accent' }]]}
          />
          <Reveal as="p" delay={150} className="t-lede max-w-[520px] text-soft">
            Open to senior roles building AI into healthcare: applied AI, clinical software and the platforms under
            them. Always glad to talk about putting models in front of patients and clinicians safely.
          </Reveal>
          <Reveal delay={250}>
            <a
              href={`mailto:${email}`}
              onPointerEnter={start}
              onPointerLeave={stop}
              onFocus={start}
              onBlur={stop}
              className="group t-title inline-block max-w-full break-all text-[clamp(28px,3.6vw,56px)] transition-colors duration-500 hover:text-accent focus-visible:text-accent"
            >
              <span className="link-underline">{email}</span>
            </a>
            <p className="t-label mt-4 text-muted" aria-hidden="true">
              Point here to weave · picks so far <span ref={tally} className="text-accent">000</span>
            </p>
          </Reveal>
        </div>
        <Cloth patterns={['next']} frame={frame} pressable={false} className="h-[60svh] md:h-auto" />
      </div>
    </section>
  )
}
