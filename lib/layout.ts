import { about, contactPoints, experience, projects, wrap } from './content'

/**
 * Where every readable thing in a section stands, in that section's own yawed
 * frame.
 *
 * This used to live inside the four section components, one set of constants
 * each, which was fine for exactly as long as the components were the only
 * things that needed to know. The tour broke that: "drive to every role" is a
 * question about Work's row pitch asked from outside Work, and answering it by
 * restating `ROW_SPACING = 10` in `lib/tour` is two descriptions of one column
 * that drift apart the first time a row is added.
 *
 * So the anchors are solved once, here, and both the renderer and the autopilot
 * read them. The same argument `lib/keepout` makes about `region`: whoever owns
 * the number owns it for everybody.
 *
 * Coordinates are local to the section's `<group position={zone} rotation=[0,
 * WORLD_YAW, 0]>` — pass them through `toWorld` to get world ground positions.
 */

/* ------------------------------------------------------------------ */
/* Work                                                                */
/* ------------------------------------------------------------------ */

/**
 * Row pitch, set by the tallest thing a row can become rather than by how a
 * closed one looks.
 *
 * An open row is 9.4m of copy: a heading, three lines of preamble and three
 * projects with their stacks under them. At 7.5m the last stack ran 0.8m past
 * the pitch and printed itself across the *next* role's company name — and
 * because only the near row opens, the collision only appeared once you drove
 * up to read something, which is the one moment it must not.
 */
export const WORK_ROW_SPACING = 10

/**
 * Clears the zone marker's footprint so rows never sit under it.
 *
 * Measured against an *open* row, not a closed one. A row's copy runs from its
 * marker back toward the camera — nearly 7m of it once the projects unfold —
 * so a start that only cleared the row's heading put the first role's project
 * list underneath the zone's outline and its floating label.
 */
export const WORK_CONTENT_START = 12

/** The lane the car drives down. Markers and copy sit off to one side of it. */
export const WORK_MARKER_X = -9

/**
 * Local z of each role, newest nearest.
 *
 * Anchored on the lane rather than on the text at x=-4: measuring to the text
 * puts every row a constant 4m of lateral offset away before the driver has
 * moved at all, which eats most of the open-on-approach radius.
 */
export const WORK_ROWS: number[] = experience.map(
  (_, i) => -(WORK_CONTENT_START + i * WORK_ROW_SPACING)
)

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

export const PROJECT_SPACING = 8.5

/**
 * Clears the zone marker's footprint.
 *
 * Measured against an *open* board: its copy is painted on the ground in front
 * of it and runs some 8m back toward the camera, so a start that only cleared
 * the boards themselves left the active project's blurb lying across the zone
 * outline and under its floating label.
 */
export const PROJECT_CONTENT_START = 12.5

/** Local x of each board in the row. */
export const PROJECT_COLUMNS: number[] = projects.map(
  (_, i) => (i - (projects.length - 1) / 2) * PROJECT_SPACING
)

/**
 * How far in front of a board its "you are here" point sits.
 *
 * A board opens as you pull up facing it rather than when you clip its base,
 * and this is that offset — used both for the proximity test and, by the tour,
 * as the spot to park on.
 */
export const PROJECT_STAND_OFFSET = 3.5

/* ------------------------------------------------------------------ */
/* About                                                               */
/* ------------------------------------------------------------------ */

export const ABOUT_COL_WIDTH = 14
/** Where the summary sits: past the marker, before the columns. */
export const ABOUT_SUMMARY_START = 5.4
/**
 * Where the columns start, measured to the *nearest* line of the first block.
 *
 * A block is anchored on its title and its lines run back toward the camera,
 * so laying the anchors out on a running cursor put each block's copy in the
 * space in front of it — and the first block's copy across the zone marker.
 * The cursor below tracks that near edge instead.
 */
export const ABOUT_CONTENT_START = 8
export const ABOUT_LINE_HEIGHT = 0.62
export const ABOUT_TITLE_GAP = 1.0
export const ABOUT_BLOCK_GAP = 2.4

export type AboutBlock = {
  title: string
  lines: string[]
  /**
   * Each line's z offset from the block's title.
   *
   * Precomputed rather than accumulated at render time because `wrap` can
   * return multi-line strings — a line's offset depends on how many *rendered*
   * lines precede it, not how many entries — and the block's own height is the
   * same sum. Computing it twice is how the two answers disagree.
   */
  offsets: number[]
  /** 0 or 1 — which of the two columns this block was laid into. */
  col: number
  /** Local z of the block's title, positive; the group renders at -z. */
  z: number
  /** How far the block's lines run back toward the camera from its title. */
  height: number
  index: number
}

/** wrap() can return multi-line strings, so count rendered lines, not entries. */
function renderedLines(lines: string[]) {
  return lines.reduce((n, line) => n + line.split('\n').length, 0)
}

/**
 * Background, laid into two columns, each with its own running cursor rather
 * than a fixed grid. Their heights differ wildly (skills has six categories,
 * languages has two), and a fixed row height silently overlaps them.
 */
export const ABOUT_BLOCKS: AboutBlock[] = (() => {
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
  const cursors = [ABOUT_CONTENT_START, ABOUT_CONTENT_START]
  return blocks.map((block, index) => {
    const col = block.title === 'SKILLS' ? 1 : 0
    const offsets = block.lines.map(
      (_, i) =>
        ABOUT_TITLE_GAP +
        renderedLines(block.lines.slice(0, i)) * ABOUT_LINE_HEIGHT
    )
    const height =
      ABOUT_TITLE_GAP + renderedLines(block.lines) * ABOUT_LINE_HEIGHT
    // The cursor is the near edge of the space still free, and a block fills
    // it backwards from its title — so the title goes a whole block-height
    // beyond where the last one ended.
    const z = cursors[col] + height
    cursors[col] = z + ABOUT_BLOCK_GAP
    return { ...block, offsets, col, z, height, index }
  })
})()

/** Local x of a block's left edge; its lines run right from there. */
export function aboutColumnX(col: number): number {
  return -ABOUT_COL_WIDTH + col * (ABOUT_COL_WIDTH + 2)
}

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */

export const CONTACT_SPACING = 6

/**
 * Clears the marker's footprint.
 *
 * Shorter than the equivalent in Work or Projects, and it can be: a plinth's
 * copy is two lines directly in front of it rather than a paragraph running
 * back toward the camera, so there is nothing to collide with the zone outline.
 */
export const CONTACT_CONTENT_START = 9.5

/** Local x of each plinth in the row. */
export const CONTACT_COLUMNS: number[] = contactPoints.map(
  (_, i) => (i - (contactPoints.length - 1) / 2) * CONTACT_SPACING
)

/** As `PROJECT_STAND_OFFSET`, for the plinth row. */
export const CONTACT_STAND_OFFSET = 2.5
