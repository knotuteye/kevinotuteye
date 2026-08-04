import { useMemo } from 'react'
import { about, wrap } from '../../../lib/content'
import { useObstacles, type Obstacle } from '../../../lib/obstacles'
import { toWorld, WORLD_YAW, ZONES } from '../../../lib/world'
import { useClayMaterial } from '../Clay'
import GroundText from '../GroundText'
import GroundShadow from '../Shadow'

/**
 * Background, painted flat on the ground in blocks — education, skills,
 * certifications, recognition, languages.
 *
 * Blocks are laid into two columns, each with its own running cursor rather
 * than a fixed grid. Their heights differ wildly (skills has six categories,
 * languages has two), and a fixed row height silently overlaps them.
 */

const COL_WIDTH = 14
/** Clears the zone marker's footprint. */
const CONTENT_START = 6
const LINE_HEIGHT = 0.62
const TITLE_GAP = 1.0
const BLOCK_GAP = 2.4

function Pillar({ index, x }: { index: number; x: number }) {
  const material = useClayMaterial({ index })
  return (
    <mesh material={material} position={[x, 0.55, 0]}>
      <cylinderGeometry args={[0.22, 0.28, 1.1, 6]} />
    </mesh>
  )
}

/** wrap() can return multi-line strings, so count rendered lines, not entries. */
function renderedLines(lines: string[]) {
  return lines.reduce((n, line) => n + line.split('\n').length, 0)
}

export default function AboutSection() {
  const [zx, zz] = ZONES.about.position

  // Memoised as one unit because the layout below is a running cursor: the
  // blocks and their positions are computed together or not at all, and the
  // pillars' colliders need identities that survive a render.
  const placed = useMemo(() => {
    const blocks: { title: string; lines: string[] }[] = [
      {
        title: 'EDUCATION',
        lines: about.education.flatMap((e) => [
          e.qualification,
          `${e.institution.replace(/\s*\(.*\)\s*/, '')} · ${e.year}`,
          ...(e.highlights ?? []).map((h) => wrap(h, 40, 2)),
        ]),
      },
      {
        title: 'CERTIFICATIONS',
        lines: about.certifications.map((c) => `${c.name} · ${c.year}`),
      },
      {
        title: 'RECOGNITION',
        lines: about.recognition.flatMap((r) => [
          r.title,
          `${r.detail} · ${r.year}`,
        ]),
      },
      {
        title: 'LANGUAGES',
        lines: about.languages.map((l) => `${l.language} — ${l.proficiency}`),
      },
      {
        title: 'SKILLS',
        lines: about.skills.flatMap((s) => [
          s.category,
          wrap(s.items.join('  ·  '), 40, 2),
        ]),
      },
    ]

    // Skills sits alone in the right column — it is taller than the other four
    // combined, so pairing it with anything would leave a ragged hole.
    const cursors = [CONTENT_START, CONTENT_START]
    return blocks.map((block, index) => {
      const col = block.title === 'SKILLS' ? 1 : 0
      const z = cursors[col]
      cursors[col] +=
        TITLE_GAP + renderedLines(block.lines) * LINE_HEIGHT + BLOCK_GAP
      return { ...block, col, z, index }
    })
  }, [])

  const obstacles = useMemo<Obstacle[]>(
    () =>
      placed.map((block) => ({
        kind: 'cylinder',
        position: toWorld(
          [zx, zz],
          -COL_WIDTH + block.col * (COL_WIDTH + 2) - 1.1,
          -block.z
        ),
        radius: 0.28,
        height: 1.1,
        y: 0.55,
      })),
    [placed, zx, zz]
  )
  useObstacles(obstacles)

  return (
    <group position={[zx, 0, zz]} rotation={[0, WORLD_YAW, 0]}>
      <GroundText
        position={[-COL_WIDTH, 0.6]}
        size={0.42}
        opacity={0.92}
        maxWidth={26}
      >
        {wrap(about.summary, 74, 3)}
      </GroundText>

      {placed.map((block) => {
        const x = -COL_WIDTH + block.col * (COL_WIDTH + 2)

        return (
          <group key={block.title} position={[x, 0, -block.z]}>
            <Pillar index={block.index} x={-1.1} />
            <GroundShadow
              position={toWorld([zx, zz], x - 1.1, -block.z)}
              size={[1.5, 1.5]}
              height={1.1}
              intensity={0.8}
            />

            <GroundText position={[0, 0]} size={0.6} letterSpacing={0.16}>
              {block.title}
            </GroundText>

            {block.lines.map((line, i) => (
              <GroundText
                key={`${block.title}-${i}`}
                position={[
                  0,
                  TITLE_GAP + renderedLines(block.lines.slice(0, i)) * LINE_HEIGHT,
                ]}
                size={0.29}
                opacity={i % 2 === 0 ? 0.92 : 0.66}
                maxWidth={COL_WIDTH - 1}
              >
                {line}
              </GroundText>
            ))}
          </group>
        )
      })}
    </group>
  )
}
