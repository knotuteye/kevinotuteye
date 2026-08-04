import { useEffect, useRef, useState } from 'react'
import { bindTouchButton, hasTouch, isDriving, type TouchAction } from '../lib/controls'

/**
 * The world's only chrome: what the keys are, and — on touch — the buttons
 * themselves.
 *
 * A driving control scheme is only obvious to someone who already knows they
 * are driving. The hint sits over the canvas until you actually move, then
 * fades and stays gone; the buttons are permanent on touch, where there is no
 * other way in at all.
 */

const BUTTONS: { action: TouchAction; label: string; className: string }[] = [
  { action: 'left', label: '◀', className: 'col-start-1 row-start-2' },
  { action: 'up', label: '▲', className: 'col-start-2 row-start-1' },
  { action: 'right', label: '▶', className: 'col-start-3 row-start-2' },
  { action: 'down', label: '▼', className: 'col-start-2 row-start-2' },
]

function TouchButton({ action, label }: { action: TouchAction; label: string }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [held, setHeld] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const unbind = bindTouchButton(node, action)
    const down = () => setHeld(true)
    const up = () => setHeld(false)
    node.addEventListener('pointerdown', down)
    node.addEventListener('pointerup', up)
    node.addEventListener('pointercancel', up)
    return () => {
      unbind()
      node.removeEventListener('pointerdown', down)
      node.removeEventListener('pointerup', up)
      node.removeEventListener('pointercancel', up)
    }
  }, [action])

  return (
    <button
      ref={ref}
      type="button"
      aria-label={action}
      // touch-none stops the browser treating a held button as a pan gesture,
      // which would cancel the pointer and leave the car accelerating.
      className={`h-16 w-16 touch-none select-none rounded-xl border-2 border-white/70 text-xl text-white transition-colors ${
        held ? 'bg-white/30' : 'bg-white/10'
      }`}
    >
      {label}
    </button>
  )
}

export default function DriveControls() {
  const [touch, setTouch] = useState(false)
  const [moved, setMoved] = useState(false)

  useEffect(() => setTouch(hasTouch()), [])

  // Polled rather than driven from the input handlers, so this stays ignorant
  // of which control the driver actually used.
  useEffect(() => {
    if (moved) return
    const id = window.setInterval(() => {
      if (isDriving()) setMoved(true)
    }, 200)
    return () => window.clearInterval(id)
  }, [moved])

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      <div
        className={`absolute inset-x-0 top-6 flex justify-center transition-opacity duration-700 ${
          moved ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <p className="rounded-full bg-black/25 px-5 py-2 text-center font-heading text-xs uppercase tracking-[0.2em] text-white backdrop-blur-sm">
          {touch
            ? 'Drive to explore'
            : 'W A S D or arrows to drive · shift to boost · space to brake · R to reset'}
        </p>
      </div>

      {touch ? (
        <div className="pointer-events-auto absolute bottom-8 left-1/2 grid -translate-x-1/2 grid-cols-3 grid-rows-2 gap-2">
          {BUTTONS.map((button) => (
            <div key={button.action} className={button.className}>
              <TouchButton action={button.action} label={button.label} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
