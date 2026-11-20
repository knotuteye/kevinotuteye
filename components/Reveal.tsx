import {
  createElement,
  useEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react'
import {
  getLoomPhase,
  getServerLoomPhase,
  LOOM,
  subscribeLoom,
} from '../lib/loom'

/**
 * Adds `is-in` once the element scrolls into view, and never while the loom
 * is covering the screen, so nothing animates where nobody can see it. On the
 * first load the reveal waits for the intro to start lifting.
 */
function useReveal() {
  const ref = useRef<HTMLElement>(null)
  const phase = useSyncExternalStore(subscribeLoom, getLoomPhase, getServerLoomPhase)
  const ready = phase !== 'cover'
  const intro = phase === 'intro'

  useEffect(() => {
    const el = ref.current
    if (!el || !ready) return
    if (intro) el.style.setProperty('--intro', `${LOOM.introDelay}ms`)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        el.classList.add('is-in')
        observer.disconnect()
      },
      { rootMargin: '0px 0px -8% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ready, intro])

  return ref
}

type RevealProps = {
  as?: ElementType
  delay?: number
  className?: string
  children: ReactNode
  id?: string
}

export function Reveal({ as = 'div', delay = 0, className = '', children, id }: RevealProps) {
  const ref = useReveal()
  return createElement(
    as,
    {
      ref,
      id,
      className: `reveal ${className}`,
      style: { '--delay': `calc(${delay}ms + var(--intro, 0ms))` } as CSSProperties,
    },
    children
  )
}

type LinesProps = {
  as?: ElementType
  lines: ReactNode[]
  delay?: number
  className?: string
  id?: string
}

/** A display heading whose lines rise out of their own masks, one after another. */
export function Lines({ as = 'h2', lines, delay = 0, className = '', id }: LinesProps) {
  const ref = useReveal()
  return createElement(
    as,
    {
      ref,
      id,
      className: `lines ${className}`,
      style: { '--delay': `calc(${delay}ms + var(--intro, 0ms))` } as CSSProperties,
    },
    lines.map((line, i) => (
      <span key={i} style={{ '--line': i } as CSSProperties}>
        <span>{line}</span>
      </span>
    ))
  )
}

/** The brand arrow, drawn so it matches the display type at any size. */
export function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 150 110"
      fill="none"
      stroke="currentColor"
      strokeWidth={16}
      strokeLinecap="square"
      className={className}
    >
      <path d="M8 55 H130" />
      <path d="M88 13 L132 55 L88 97" />
    </svg>
  )
}
