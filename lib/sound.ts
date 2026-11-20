/**
 * The sound of the loom, synthesised: no audio files. Off until the visitor
 * turns it on, and remembered for the session.
 *
 *   clack  the beater striking the fell
 *   swish  the shuttle through the shed
 *   thud   a strip locking into place
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null
let enabled = false
const listeners = new Set<() => void>()

export const isSoundOn = () => enabled
export const getServerSound = () => false

export function subscribeSound(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function setup() {
  if (ctx) return ctx
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 0.5
  master.connect(ctx.destination)
  noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return ctx
}

export function setSound(on: boolean) {
  enabled = on
  try {
    sessionStorage.setItem('sound', on ? '1' : '0')
  } catch {}
  if (on) {
    const c = setup()
    void c?.resume()
  } else {
    void ctx?.suspend()
  }
  listeners.forEach((fn) => fn())
}

/** Restores the choice made earlier in the session. Needs a gesture to play. */
export function restoreSound() {
  try {
    if (sessionStorage.getItem('sound') === '1') {
      enabled = true
      listeners.forEach((fn) => fn())
    }
  } catch {}
}

function burst(freq: number, q: number, gain: number, decay: number, when = 0) {
  if (!enabled || !ctx || !master || !noise || ctx.state !== 'running') return
  const t = ctx.currentTime + when
  const src = ctx.createBufferSource()
  src.buffer = noise
  src.playbackRate.value = 0.8 + Math.random() * 0.4
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq * (0.9 + Math.random() * 0.2)
  filter.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
  src.connect(filter).connect(g).connect(master)
  src.start(t, Math.random() * 0.3, decay + 0.05)
}

function tone(freq: number, gain: number, decay: number, when = 0) {
  if (!enabled || !ctx || !master || ctx.state !== 'running') return
  const t = ctx.currentTime + when
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, t)
  osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + decay)
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
  osc.connect(g).connect(master)
  osc.start(t)
  osc.stop(t + decay + 0.02)
}

export function clack(strength = 1) {
  burst(2400, 6, 0.35 * strength, 0.05)
  burst(900, 3, 0.25 * strength, 0.08)
  tone(140, 0.25 * strength, 0.09)
}

export function swish(strength = 1) {
  burst(5200, 0.8, 0.05 * strength, 0.22)
}

export function thud(strength = 1) {
  tone(90, 0.3 * strength, 0.16)
  burst(600, 2, 0.12 * strength, 0.06)
}
