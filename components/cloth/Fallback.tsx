import { DYES, PATTERNS, warpEnds, type PatternId } from '../../lib/kente'

/**
 * What shows before the loom draws, and instead of it without WebGL2: each
 * strip's warp stripe as a CSS gradient. Rendered on the server, so the first
 * paint already has the right colours in the right places.
 */
export default function ClothFallback({
  patterns,
  className = '',
  gap = 3,
}: {
  patterns: PatternId[]
  className?: string
  gap?: number
}) {
  return (
    <div className={`flex h-full w-full ${className}`} style={{ gap }}>
      {patterns.map((id, i) => {
        const ends = warpEnds(PATTERNS[id])
        const stops = ends
          .map((dye, k) => `${DYES[dye]} ${(k / ends.length) * 100}% ${((k + 1) / ends.length) * 100}%`)
          .join(',')
        return (
          <div
            key={`${id}-${i}`}
            className="h-full min-w-0 flex-1 opacity-90"
            style={{ background: `linear-gradient(90deg,${stops})` }}
          />
        )
      })}
    </div>
  )
}
