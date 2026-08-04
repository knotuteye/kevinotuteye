import { useEffect, useState } from 'react'

export type Capabilities = {
  /** True once detection has run on the client. Always false during SSR. */
  resolved: boolean
  webgl: boolean
  reducedMotion: boolean
  lowPower: boolean
  /** The single answer callers want: should we mount the 3D world? */
  canRenderWorld: boolean
}

const SSR_DEFAULT: Capabilities = {
  resolved: false,
  webgl: false,
  reducedMotion: false,
  lowPower: false,
  canRenderWorld: false,
}

function detectWebGL(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    if (!gl) return false
    // Some software renderers expose a context but cannot sustain a scene.
    const debug = (gl as WebGLRenderingContext).getExtension(
      'WEBGL_debug_renderer_info'
    )
    if (debug) {
      const renderer = String(
        (gl as WebGLRenderingContext).getParameter(
          debug.UNMASKED_RENDERER_WEBGL
        ) ?? ''
      ).toLowerCase()
      if (renderer.includes('swiftshader') || renderer.includes('llvmpipe')) {
        return false
      }
    }
    return true
  } catch {
    return false
  }
}

/**
 * Decides between the 3D world and the static DOM site.
 *
 * Detection is deliberately client-only: the server always renders the DOM
 * layer, so crawlers and no-JS visitors get real HTML, and the canvas replaces
 * it after mount. That ordering also keeps hydration free of mismatches.
 */
export function useCapabilities(): Capabilities {
  const [caps, setCaps] = useState<Capabilities>(SSR_DEFAULT)

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const webgl = detectWebGL()
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 2

    const apply = () => {
      const reducedMotion = motionQuery.matches
      setCaps({
        resolved: true,
        webgl,
        reducedMotion,
        lowPower,
        canRenderWorld: webgl && !reducedMotion && !lowPower,
      })
    }

    apply()
    motionQuery.addEventListener('change', apply)
    return () => motionQuery.removeEventListener('change', apply)
  }, [])

  return caps
}
