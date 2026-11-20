import {
  createElement,
  useEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react'
import { getPhase, getServerPhase, subscribePhase } from '../lib/transition'

/**
 * Adds `is-in` once the element scrolls into view, but never while the cloth
 * covers the screen, so nothing animates where nobody can see it.
 */
function useReveal(immediate = false) {
  const ref = useRef<HTMLElement>(null)
  const phase = useSyncExternalStore(subscribePhase, getPhase, getServerPhase)
  const ready = phase !== 'cover'

  useEffect(() => {
    const el = ref.current
    if (!el || !ready) return
    if (immediate) {
      requestAnimationFrame(() => el.classList.add('is-in'))
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        el.classList.add('is-in')
        observer.disconnect()
      },
      { rootMargin: '0px 0px -10% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ready, immediate])

  return ref
}

type RevealProps = {
  as?: ElementType
  /** Play as soon as mounted rather than on scroll. */
  immediate?: boolean
  delay?: number
  className?: string
  children: ReactNode
  id?: string
  style?: CSSProperties
}

export function Reveal({ as = 'div', immediate = false, delay = 0, className = '', children, id, style }: RevealProps) {
  const ref = useReveal(immediate)
  return createElement(
    as,
    { ref, id, className: `reveal ${className}`, style: { ...style, '--delay': `${delay}ms` } as CSSProperties },
    children
  )
}

type WovenProps = {
  as?: ElementType
  /** Lines of the heading. A line may hold `<em>`-style parts. */
  lines: (string | { text: string; italic?: boolean; className?: string }[])[]
  delay?: number
  className?: string
  id?: string
  /** Play as soon as mounted rather than on scroll. */
  immediate?: boolean
}

/**
 * A heading woven in: letters alternate between rising from below and
 * dropping from above, like a weft going over one warp and under the next.
 * Screen readers get the plain text once; the letters are hidden from them.
 */
export function Woven({ as = 'h2', lines, delay = 0, className = '', id, immediate = false }: WovenProps) {
  const ref = useReveal(immediate)
  let i = 0
  const label = lines
    .map((line) => (typeof line === 'string' ? line : line.map((p) => p.text).join('')))
    .join(' ')

  return createElement(
    as,
    {
      ref,
      id,
      'aria-label': label,
      className: `woven ${className}`,
      style: { '--delay': `${delay}ms` } as CSSProperties,
    },
    lines.map((line, l) => {
      const parts = typeof line === 'string' ? [{ text: line }] : line
      return (
        <span key={l} aria-hidden="true" className="block">
          {parts.map((part, p) => (
            <span
              key={p}
              className={`${'italic' in part && part.italic ? 'italic' : ''} ${('className' in part && part.className) || ''}`}
            >
              {part.text.split(/(\s+)/).map((word, w) =>
                /^\s+$/.test(word) ? (
                  ' '
                ) : (
                  <span key={w} className="w-word">
                    {Array.from(word).map((ch, c) => {
                      const k = i++
                      return (
                        <span key={c} className="w-ch">
                          <span style={{ '--i': k, '--from': k % 2 ? '-110%' : '110%' } as CSSProperties}>
                            {ch}
                          </span>
                        </span>
                      )
                    })}
                  </span>
                )
              )}
            </span>
          ))}
        </span>
      )
    })
  )
}

/** The arrow, drawn to sit with the serif at any size. */
export function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
    >
      <path d="M0 8h22" />
      <path d="M15 1l7 7-7 7" />
    </svg>
  )
}
