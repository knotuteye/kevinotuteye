import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from 'next/font/google'

/**
 * Self-hosted at build time by next/font: no request to Google from the
 * visitor's browser, and no layout shift while fonts load.
 *
 * Instrument Serif carries the voice: tall, narrow and calm, the way a strip
 * of cloth is. Its italic marks the words that matter. Instrument Sans, from
 * the same family, does the reading; JetBrains Mono does the labelling, like
 * the accession numbers on a museum card.
 */
export const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

export const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const fontVariables = [
  instrumentSerif.variable,
  instrumentSans.variable,
  jetbrainsMono.variable,
].join(' ')
