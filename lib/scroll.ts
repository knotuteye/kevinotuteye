import Lenis from 'lenis'
import { prefersReducedMotion } from './motion'

/**
 * Smoothed scrolling, so the scroll-driven loom moves like cloth rather than
 * stepping with the wheel. It drives the native scroll position, so every
 * other piece of code keeps using window.scrollY and getBoundingClientRect.
 * Off under reduced motion, and on touch, where native scrolling is better.
 */

let lenis: Lenis | null = null
let raf = 0

export function startSmoothScroll() {
  if (lenis || prefersReducedMotion()) return
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.9, syncTouch: false })
  const loop = (time: number) => {
    lenis?.raf(time)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
}

export function stopSmoothScroll() {
  cancelAnimationFrame(raf)
  lenis?.destroy()
  lenis = null
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
  else window.scrollTo(0, 0)
}

export function scrollToElement(el: HTMLElement) {
  if (lenis) lenis.scrollTo(el, { offset: -24, duration: 1.4 })
  else el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

/** Pause scrolling, e.g. while a menu is open. */
export function lockScroll(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop()
    else lenis.start()
  }
  document.documentElement.style.overflow = locked ? 'hidden' : ''
}
