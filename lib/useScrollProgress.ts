import { useEffect, type RefObject } from 'react'
import { clamp } from './motion'

/**
 * Calls `onProgress` with how far an element has travelled through the
 * viewport: 0 as its top enters at the bottom, 1 as its bottom leaves at the
 * top. Throttled to one call per frame, and only while it is near the screen.
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, onProgress: (p: number) => void) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    let near = false
    const update = () => {
      raf = 0
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      onProgress(clamp((vh - rect.top) / (vh + rect.height)))
    }
    const onScroll = () => {
      if (near && !raf) raf = requestAnimationFrame(update)
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting
        if (near) onScroll()
      },
      { rootMargin: '20% 0px' }
    )
    io.observe(el)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    update()
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [ref, onProgress])
}
