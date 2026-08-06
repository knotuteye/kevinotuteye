import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { playHorn, setMuted, useMuted } from '../lib/audio'
import {
  bindJoystick,
  bindTouchButton,
  hasTouch,
  isDriving,
  requestEvent,
  type TouchAction,
} from '../lib/controls'
import { openInteraction, useInteraction } from '../lib/interact'
import { useTouring } from '../lib/tour'
import Compass from './Compass'

/**
 * The world's only chrome: what the keys are, where everything is, what the
 * thing you are parked at will do, and — on touch — the joystick.
 *
 * A driving control scheme is only obvious to someone who already knows they
 * are driving. The hint sits over the canvas until you actually move, then
 * fades and stays gone; the stick is permanent on touch, where there is no
 * other way in at all.
 *
 * Everything added here since is a different kind of thing to the hint, and the
 * distinction is worth keeping: the hint teaches the controls once, whereas the
 * compass and the prompt are live readouts of where you are and what is within
 * reach. Those never fade, because the question they answer never stops being
 * asked.
 */

/** Touch detection is a client fact, so it is read through a store rather than
 *  set from an effect — the server has no answer and must not guess one. */
const noop = () => () => {}

function useIsTouch(): boolean {
  return useSyncExternalStore(noop, hasTouch, () => false)
}

/* ------------------------------------------------------------------ */
/* Joystick                                                            */
/* ------------------------------------------------------------------ */

/**
 * folio's stick: you point it where you want the car to go and it goes there.
 * The heading maths lives in `lib/controls`; this is the surface for a thumb
 * and the dot that shows where that thumb is.
 */
function Joystick() {
  const pad = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = pad.current
    if (!node) return
    // The knob is moved by writing its transform rather than by setting state:
    // this fires on every pointer move, and a re-render per move to reposition
    // one div is a frame's worth of React for a dot.
    return bindJoystick(node, (x, y) => {
      if (knob.current) {
        knob.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
      }
    })
  }, [])

  return (
    <div
      ref={pad}
      // touch-none stops the browser reading a drag as a page pan, which would
      // cancel the pointer mid-corner and leave the car steering itself.
      className="pointer-events-auto relative h-36 w-36 touch-none select-none rounded-full border-2 border-white/60 bg-white/10"
      role="application"
      aria-label="Steering joystick"
    >
      <div className="absolute inset-0 grid place-items-center">
        <div
          ref={knob}
          className="h-14 w-14 rounded-full border-2 border-white/80 bg-white/30"
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

function TouchButton({
  action,
  label,
  title,
}: {
  action: TouchAction
  label: string
  title: string
}) {
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
      aria-label={title}
      className={`pointer-events-auto h-16 w-16 touch-none select-none rounded-full border-2 border-white/70 font-heading text-[0.6rem] uppercase tracking-widest text-white transition-colors ${
        held ? 'bg-white/30' : 'bg-white/10'
      }`}
    >
      {label}
    </button>
  )
}

const CHROME_BUTTON =
  'pointer-events-auto rounded-full bg-black/25 px-4 py-2 font-heading text-xs uppercase tracking-[0.2em] text-white backdrop-blur-sm transition-colors hover:bg-black/40'

function SoundButton() {
  const muted = useMuted()

  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-pressed={muted}
      aria-label={muted ? 'Unmute' : 'Mute'}
      className={CHROME_BUTTON}
    >
      {muted ? 'Sound off' : 'Sound on'}
    </button>
  )
}

/**
 * The way out.
 *
 * Now that the scenery is solid there is a way to end up somewhere you cannot
 * drive out of — nosed under a board, or wedged against a tree — and R is not
 * an option on a phone. It sits up here with the sound rather than down in the
 * thumb zone because it is the button you want to be able to find and not the
 * one you want to hit by accident.
 */
function ResetButton() {
  return (
    <button
      type="button"
      onClick={() => requestEvent('reset')}
      aria-label="Return the car to the start"
      className={CHROME_BUTTON}
    >
      Reset
    </button>
  )
}

/**
 * For everyone who is not going to drive.
 *
 * The reasoning is in `lib/tour`. What matters here is that it is a button and
 * not a default: it is offered, once, in the same row as the other two, and a
 * visitor who ignores it never sees the site behave on its own.
 */
function TourButton() {
  const touring = useTouring()

  return (
    <button
      type="button"
      onClick={() => requestEvent('tour')}
      aria-pressed={touring}
      aria-label={touring ? 'Stop the tour' : 'Drive the tour for me'}
      className={CHROME_BUTTON}
    >
      {touring ? 'Stop tour' : 'Tour'}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Interaction                                                         */
/* ------------------------------------------------------------------ */

/**
 * Names whatever the car is parked at, and on touch is the way to fire it.
 *
 * The prompt is the entire discoverability story for the interaction verb —
 * there is no menu it could live in and no cursor to hover — so it says the
 * whole sentence rather than showing a key and trusting the reader to guess:
 * "press E to open kronos", not "E".
 *
 * On touch it becomes the button itself. A phone has no E, and adding a fifth
 * circle to the thumb cluster for something that is only occasionally live
 * would leave a dead control on screen most of the time.
 */
function InteractPrompt({ touch }: { touch: boolean }) {
  const interaction = useInteraction()
  if (!interaction) return null

  const position = touch
    ? 'absolute inset-x-0 bottom-52 flex justify-center px-6'
    : 'absolute inset-x-0 bottom-8 flex justify-center px-6'

  if (touch) {
    return (
      <div className={position}>
        <button
          type="button"
          onClick={openInteraction}
          className="pointer-events-auto max-w-full truncate rounded-full bg-white px-6 py-3 font-heading text-xs uppercase tracking-[0.2em] text-orangeRed shadow-lg"
        >
          {interaction.label}
        </button>
      </div>
    )
  }

  return (
    <div className={position}>
      <p className="max-w-full truncate rounded-full bg-black/30 px-5 py-2 font-heading text-xs uppercase tracking-[0.2em] text-white backdrop-blur-sm">
        <span className="mr-2 rounded border border-white/50 px-1.5 py-0.5 text-[0.65rem]">
          E
        </span>
        {interaction.label}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Chrome                                                              */
/* ------------------------------------------------------------------ */

export default function DriveControls() {
  const touch = useIsTouch()
  const [moved, setMoved] = useState(false)

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
    <>
      <Compass />

      <div className="pointer-events-none fixed inset-0 z-20">
        {/* Below the buttons on a phone, beside them on anything wider: a
            centred pill and a right-hand pair collide on a 390px screen. */}
        <div
          className={`absolute inset-x-0 top-20 flex justify-center px-4 transition-opacity duration-700 sm:top-6 ${
            moved ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <p className="rounded-full bg-black/25 px-5 py-2 text-center font-heading text-xs uppercase tracking-[0.2em] text-white backdrop-blur-sm">
            {touch
              ? 'Push the stick to drive · tap a prompt to open it'
              : 'W A S D or arrows to drive · shift to boost · space to brake · E open · T tour · H horn · R reset · M mute'}
          </p>
        </div>

        <div className="absolute right-6 top-6 flex gap-2">
          <TourButton />
          <ResetButton />
          <SoundButton />
        </div>

        <InteractPrompt touch={touch} />

        {touch ? (
          <>
            <div className="absolute bottom-10 left-8">
              <Joystick />
            </div>

            {/* Reverse and brake stay as buttons: they are momentary states, not
                directions, and the stick has no way to say either. */}
            <div className="absolute bottom-10 right-8 flex flex-col items-end gap-3">
              <button
                type="button"
                onClick={playHorn}
                aria-label="Horn"
                className="pointer-events-auto h-16 w-16 touch-none select-none rounded-full border-2 border-white/70 bg-white/10 font-heading text-[0.6rem] uppercase tracking-widest text-white"
              >
                Horn
              </button>
              <TouchButton action="down" label="Rev" title="Reverse" />
              <TouchButton action="brake" label="Brake" title="Brake" />
            </div>
          </>
        ) : null}
      </div>
    </>
  )
}
