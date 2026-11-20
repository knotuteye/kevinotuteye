import { Archivo, Instrument_Sans, JetBrains_Mono } from 'next/font/google'

/**
 * Self-hosted at build time by next/font, so there is no request to Google from
 * the visitor's browser and no layout shift while fonts load.
 *
 * Archivo is loaded as the full variable font with its width axis. The narrow
 * width (62.5) is the brand, and widening it on hover ("stretching the cloth")
 * needs the axis available at runtime.
 */
export const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
})

export const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
})

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const fontVariables = [
  archivo.variable,
  instrumentSans.variable,
  jetbrainsMono.variable,
].join(' ')
