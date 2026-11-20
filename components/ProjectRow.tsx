import { chapterOf, shortDate, warmthOf, type ProjectEntry } from '../lib/content'
import { cellBackground, Kind, Thread } from '../lib/weave'
import Link from './Link'

const ACCENT = { gold: 'text-gold', harbour: 'text-harbour' } as const

/**
 * One project in a list. On hover a woven thread runs along its top edge and
 * the title stretches, the two signature moves at their smallest size.
 */
export default function ProjectRow({ project, index }: { project: ProjectEntry; index: number }) {
  const chapter = chapterOf(project)
  const warmth = warmthOf(project)
  const accent = warmth < 0.5 ? 'gold' : 'harbour'
  const meta = chapter
    ? [chapter.company, chapter.place?.city, shortDate(chapter.start).split(' ')[1]]
        .filter(Boolean)
        .join(' · ')
    : 'Side project'
  const metric = project.study?.metric

  return (
    <li>
      <Link
        href={`/work/${project.slug}`}
        className="group relative grid grid-cols-[48px_minmax(0,1fr)] items-end gap-x-4 gap-y-4 border-t border-seam py-8 md:grid-cols-[72px_minmax(0,1fr)_auto] md:gap-x-6 md:py-10"
      >
        <span
          aria-hidden="true"
          className="absolute -top-px left-0 h-[6px] w-0 transition-[width] duration-700 ease-loom group-hover:w-full group-focus-visible:w-full"
          style={{
            background: cellBackground(Kind.Warp, accent === 'gold' ? Thread.Gold : Thread.Indigo),
          }}
        />
        <span className="t-label self-start pt-2 text-muted">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="min-w-0">
          <span className="t-display stretch block text-[clamp(40px,6.5vw,96px)]">
            {project.study?.title ?? project.title}
          </span>
          <span className="t-label mt-3 block text-soft">{meta}</span>
        </span>
        {metric ? (
          <span className="col-start-2 md:col-start-auto md:text-right">
            <span className={`t-display block text-[clamp(32px,4vw,56px)] ${ACCENT[accent]}`}>
              {metric.value}
            </span>
            <span className="t-label mt-1 block text-muted">{metric.label}</span>
          </span>
        ) : null}
      </Link>
    </li>
  )
}
