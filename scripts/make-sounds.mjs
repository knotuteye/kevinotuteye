/**
 * Generates the world's sounds into `public/sounds/`.
 *
 * They are synthesised rather than sampled because the site has no sound
 * budget and no licence to spend: a recorded engine loop is a few hundred
 * kilobytes and somebody else's copyright, whereas these are a few kilobytes of
 * arithmetic that nobody has to clear. The output is committed — this runs by
 * hand when the sounds change, not as part of the build.
 *
 *   node scripts/make-sounds.mjs
 *
 * The knocks and the horn come in pools rather than singly. One sample per
 * event was the tell that gave the whole soundtrack away: scraping along a row
 * of boards played the identical waveform eight times in two seconds, and no
 * amount of pitch jitter hides that — the ear locks onto the envelope, not the
 * pitch. folio ships six brick samples and four car hits for exactly this
 * reason. Five knocks here are graded light to heavy so the selection can be
 * driven by how hard the hit actually was, rather than being a lucky dip.
 *
 * The engine loop is the one with a real constraint on it. It has to be
 * seamless, so every partial in it is an exact multiple of 1 / duration and
 * therefore comes back to the same phase at the loop point. That is also why
 * its noise floor is built from sinusoids rather than from a random buffer:
 * random noise is discontinuous across the seam and clicks once per loop.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SAMPLE_RATE = 22050
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sounds')

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Deterministic phases, so re-running the script does not rewrite the files. */
function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function normalise(samples, peak = 0.9) {
  let max = 0
  for (const sample of samples) max = Math.max(max, Math.abs(sample))
  if (max === 0) return samples
  const gain = peak / max
  for (let i = 0; i < samples.length; i++) samples[i] *= gain
  return samples
}

/** One-pole low-pass. Used only on the one-shots, which have no seam to keep. */
function lowpass(samples, cutoff) {
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SAMPLE_RATE)
  let previous = 0
  for (let i = 0; i < samples.length; i++) {
    previous += a * (samples[i] - previous)
    samples[i] = previous
  }
  return samples
}

function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2)
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    data.writeInt16LE(Math.round(clamped * 32767), i * 2)
  }

  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // PCM chunk size
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(SAMPLE_RATE * 2, 28) // byte rate
  header.writeUInt16LE(2, 32) // block align
  header.writeUInt16LE(16, 34) // bits per sample
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)

  mkdirSync(OUT, { recursive: true })
  writeFileSync(join(OUT, name), Buffer.concat([header, data]))
  console.log(`${name}  ${(44 + data.length) / 1024 | 0}KB  ${(samples.length / SAMPLE_RATE).toFixed(2)}s`)
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

function engine() {
  const duration = 0.5
  const length = Math.round(duration * SAMPLE_RATE)
  const samples = new Float32Array(length)

  // 50Hz over exactly 0.5s is 25 whole cycles; every other partial below is
  // likewise a multiple of 2Hz. Playback rate does the rest — this is the
  // sound at a crawl, and it is pitched up from here.
  const fundamental = 50
  const rand = mulberry32(7)

  const partials = []
  for (let k = 1; k <= 14; k++) {
    partials.push({
      frequency: fundamental * k,
      amplitude: 1 / Math.pow(k, 1.2),
      phase: rand() * Math.PI * 2,
    })
  }

  // The mechanical noise floor: a comb of quiet partials across the mid band,
  // spaced on the loop's own fundamental so the whole thing stays periodic.
  for (let frequency = 300; frequency <= 1800; frequency += 8) {
    partials.push({
      frequency,
      amplitude: (0.11 * 300) / frequency,
      phase: rand() * Math.PI * 2,
    })
  }

  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE
    let value = 0
    for (const { frequency, amplitude, phase } of partials) {
      value += amplitude * Math.sin(2 * Math.PI * frequency * t + phase)
    }
    // Firing lumpiness. Without it this is a tone; with it, it idles.
    samples[i] = value * (0.62 + 0.38 * Math.cos(2 * Math.PI * 24 * t))
  }

  writeWav('engine.wav', normalise(samples, 0.82))
}

/* ------------------------------------------------------------------ */
/* Horn                                                                */
/* ------------------------------------------------------------------ */

/**
 * Two horns, differing in interval and in how bright they are.
 *
 * A minor third and a perfect fourth. Both are intervals real horns are built
 * on, and swapping between them keeps a leaned-on horn button from turning into
 * a stuck note.
 */
const HORN_VARIANTS = [
  { tones: [466, 622], cutoff: 3200, duration: 0.55 },
  { tones: [440, 523], cutoff: 2600, duration: 0.5 },
]

function horn(index, { tones, cutoff, duration }) {
  const length = Math.round(duration * SAMPLE_RATE)
  const samples = new Float32Array(length)

  const attack = 0.012
  const release = 0.09

  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE
    let value = 0
    for (const tone of tones) {
      for (let k = 1; k <= 6; k++) {
        value += (1 / k) * Math.sin(2 * Math.PI * tone * k * t)
      }
    }

    const rise = Math.min(1, t / attack)
    const fall = Math.min(1, (duration - t) / release)
    samples[i] = value * rise * fall
  }

  writeWav(`horn-${index + 1}.wav`, normalise(lowpass(samples, cutoff), 0.8))
}

/* ------------------------------------------------------------------ */
/* Knocks                                                              */
/* ------------------------------------------------------------------ */

/**
 * Five knocks, ordered light to heavy, and that order is the interface.
 *
 * `lib/audio` picks an index from the impact velocity, so a keycap flicked off
 * a bumper and the car putting its nose into a project board are not the same
 * sound played at two volumes — which is what a single sample can only ever be.
 *
 * The grade runs along three axes at once, because that is what actually
 * separates a tap from a slam: heavier hits start their pitch sweep lower, ring
 * longer, and lose their top end. Turning only the volume up gives you a loud
 * tap.
 */
const KNOCK_VARIANTS = [
  { seed: 19, duration: 0.22, noiseDecay: 0.022, noiseMix: 0.7, start: 320, floor: 120, sweep: 0.04, ring: 0.05, cutoff: 3000 },
  { seed: 23, duration: 0.28, noiseDecay: 0.03, noiseMix: 0.62, start: 230, floor: 95, sweep: 0.05, ring: 0.07, cutoff: 2400 },
  { seed: 31, duration: 0.34, noiseDecay: 0.038, noiseMix: 0.58, start: 170, floor: 72, sweep: 0.06, ring: 0.09, cutoff: 1900 },
  { seed: 37, duration: 0.4, noiseDecay: 0.045, noiseMix: 0.55, start: 130, floor: 58, sweep: 0.07, ring: 0.11, cutoff: 1400 },
  { seed: 41, duration: 0.48, noiseDecay: 0.055, noiseMix: 0.5, start: 100, floor: 44, sweep: 0.09, ring: 0.14, cutoff: 1050 },
]

function knock(index, spec) {
  const length = Math.round(spec.duration * SAMPLE_RATE)
  const samples = new Float32Array(length)
  const rand = mulberry32(spec.seed)

  // Clay hitting clay: a short scrape of noise over a low thud that drops in
  // pitch as it dies, which is what makes it read as heavy rather than as a
  // click.
  let sweepPhase = 0
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE
    const noise = (rand() * 2 - 1) * Math.exp(-t / spec.noiseDecay)

    const frequency =
      spec.floor + (spec.start - spec.floor) * Math.exp(-t / spec.sweep)
    sweepPhase += (2 * Math.PI * frequency) / SAMPLE_RATE
    const thud = Math.sin(sweepPhase) * Math.exp(-t / spec.ring)

    samples[i] = noise * spec.noiseMix + thud * 0.9
  }

  writeWav(
    `impact-${index + 1}.wav`,
    normalise(lowpass(samples, spec.cutoff), 0.85)
  )
}

engine()
HORN_VARIANTS.forEach((spec, i) => horn(i, spec))
KNOCK_VARIANTS.forEach((spec, i) => knock(i, spec))
