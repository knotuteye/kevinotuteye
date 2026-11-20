import aboutJson from '../public/json/about.json'
import caseStudiesJson from '../public/json/case-studies.json'
import experienceJson from '../public/json/experience.json'
import projectsJson from '../public/json/projects.json'
import stripsJson from '../public/json/strips.json'
import weightsJson from '../public/json/weights.json'
import { CLOTH_ORDER, PATTERNS, type PatternId } from './kente'

/**
 * Single source of truth for site copy. The JSON is statically imported, so it
 * is inlined at build time and every page is plain server-rendered HTML.
 *
 * Editing public/json/*.json changes the site. Nothing here should hold copy of
 * its own except the place table, which the JSON does not carry.
 */

export type Project = {
  name: string
  link: string
  about: string
  technologies: string[]
  image?: string
}

export type Role = {
  role: string
  company: string
  aboutCompany: string
  startDate: string
  endDate: string
  projects: Project[]
}

export type Shot = {
  src: string
  width: number
  height: number
  alt: string
  caption?: string
}

type Study = {
  /** Shorter name for project rows. */
  title?: string
  /** A screenshot of the work, shown on its page. Files live in /public/img/work. */
  image?: Shot
  metric?: { value: string; label: string }
  headline?: { from: string; to: string }
  summary?: string
  sections?: { title: string; body: string }[]
}

export const experience = experienceJson.experience as Role[]
export const sideProjects = projectsJson.projects as Project[]
export const about = aboutJson

/* ------------------------------------------------------------------ */
/* Places                                                              */
/* ------------------------------------------------------------------ */

export type Place = {
  city: string
  country: string
  /** Display coordinates, already formatted. */
  coords: string
  lat: number
  lon: number
}

/**
 * Where each piece of work came from. Most of these roles were remote, so this
 * is the company's city, not a claim about where Kevin lived.
 */
const PLACES: Record<string, Place> = {
  accra: { city: 'Accra', country: 'GH', coords: '05.6037° N · 00.1870° W', lat: 5.6037, lon: -0.187 },
  kumasi: { city: 'Kumasi', country: 'GH', coords: '06.6885° N · 01.6244° W', lat: 6.6885, lon: -1.6244 },
  charlotte: { city: 'Charlotte', country: 'US', coords: '35.2271° N · 80.8431° W', lat: 35.2271, lon: -80.8431 },
  auckland: { city: 'Auckland', country: 'NZ', coords: '36.8485° S · 174.7633° E', lat: -36.8485, lon: 174.7633 },
  boston: { city: 'Boston', country: 'US', coords: '42.3601° N · 71.0589° W', lat: 42.3601, lon: -71.0589 },
}

export const KUMASI = PLACES.kumasi
export const BOSTON = PLACES.boston

function placeOf(role: Role): Place | undefined {
  const text = `${role.company} ${role.aboutCompany}`.toLowerCase()
  if (text.includes('knust') || text.includes('kumasi')) return PLACES.kumasi
  for (const key of Object.keys(PLACES)) {
    if (text.includes(key)) return PLACES[key]
  }
  return undefined
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** "KRONOS — GREEDY ALGORITHM…" → { title: "Kronos", subtitle: "Greedy algorithm…" } */
const ACRONYMS = new Set(['KNUST', 'JLS', 'HL7', 'NCA', 'PWA', 'EMR', 'FDA', 'ERP', 'ACES', 'API'])

/** Sentence case for names stored in capitals, keeping acronyms intact. */
function tidy(text: string): string {
  if (text !== text.toUpperCase()) return text
  return text
    .split(' ')
    .map((word, i) => {
      const bare = word.replace(/[^A-Z]/g, '')
      if (ACRONYMS.has(bare)) return word
      const lower = word.toLowerCase()
      return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower
    })
    .join(' ')
}

/** "JLS TRADING CO." → "JLS Trading Co.", keeping acronyms intact. */
function titleCase(text: string): string {
  if (text !== text.toUpperCase()) return text
  return text
    .split(' ')
    .map((word) => {
      const bare = word.replace(/[^A-Z]/g, '')
      if (ACRONYMS.has(bare)) return word
      const lower = word.toLowerCase()
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

function splitName(name: string): { title: string; subtitle?: string } {
  const [head, ...rest] = name.split(' — ')
  return {
    title: tidy(head.trim()),
    subtitle: rest.length ? tidy(rest.join(' — ').trim()) : undefined,
  }
}

/** Splits a "COMPANY, CITY, ST" string into its parts. */
export function splitCompany(company: string): { name: string; location: string } {
  const [name, ...rest] = company.split(',')
  return { name: name.trim(), location: rest.join(',').trim() }
}

/** "August 2021" → "Aug 2021". */
export function shortDate(date: string): string {
  const [month, year] = date.split(' ')
  return year ? `${month.slice(0, 3)} ${year}` : date
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** "August 2021" → a sortable number. "Present" sorts last. */
function monthsOf(date: string): number {
  const [month, year] = date.toLowerCase().split(' ')
  if (!year) return Number.MAX_SAFE_INTEGER
  return Number(year) * 12 + Math.max(0, MONTHS.indexOf(month.slice(0, 3)))
}

function yearOf(date: string): number {
  const match = date.match(/\d{4}/)
  return match ? Number(match[0]) : new Date().getFullYear()
}

/* ------------------------------------------------------------------ */
/* Chapters: the roles, oldest first                                   */
/* ------------------------------------------------------------------ */

export type StripInfo = {
  pattern: PatternId
  /** Name of the kente design the strip is woven after. */
  name: string
  meaning: string
  note: string
}

export type Chapter = {
  id: string
  index: number
  strip: StripInfo
  role: string
  company: string
  about: string
  start: string
  end: string
  place?: Place
  /** 0 = Kumasi gold, 1 = Boston indigo. Drives the weave and the accent. */
  warmth: number
  projects: ProjectEntry[]
}

export type ProjectEntry = {
  slug: string
  title: string
  subtitle?: string
  about: string
  link: string
  technologies: string[]
  chapterId?: string
  study?: Study
}

const studies = caseStudiesJson.studies as Record<string, Study>

function entry(project: Project, chapterId?: string): ProjectEntry {
  const { title, subtitle } = splitName(project.name)
  const slug = slugify(project.name.split(' — ')[0])
  return {
    slug,
    title,
    subtitle,
    about: project.about,
    link: project.link,
    technologies: project.technologies,
    chapterId,
    study: studies[slug],
  }
}

const ordered = [...experience].sort(
  (a, b) => monthsOf(a.startDate) - monthsOf(b.startDate)
)

const stripTable = stripsJson.strips as Record<string, Omit<StripInfo, 'pattern'> & { pattern: string }>

function stripOf(id: string, index: number): StripInfo {
  const info = stripTable[id]
  const fallback = CLOTH_ORDER[index % CLOTH_ORDER.length]
  if (!info) return { pattern: fallback, name: '', meaning: '', note: '' }
  const pattern = (info.pattern in PATTERNS ? info.pattern : fallback) as PatternId
  return { ...info, pattern }
}

export const chapters: Chapter[] = ordered.map((role, index) => {
  const id = slugify(splitCompany(role.company).name)
  return {
    id,
    index,
    strip: stripOf(id, index),
    role: role.role,
    company: titleCase(splitCompany(role.company).name),
    about: role.aboutCompany,
    start: role.startDate,
    end: role.endDate,
    place: placeOf(role),
    warmth: ordered.length > 1 ? index / (ordered.length - 1) : 0,
    projects: role.projects.map((p) => entry(p, id)),
  }
})

/** Side projects borrow the warm end of the cloth. */
export const sideProjectEntries: ProjectEntry[] = sideProjects.map((p) => entry(p))

export const allProjects: ProjectEntry[] = [
  ...sideProjectEntries,
  ...chapters.flatMap((c) => c.projects),
]

export function chapterOf(project: ProjectEntry): Chapter | undefined {
  return chapters.find((c) => c.id === project.chapterId)
}

export function projectBySlug(slug: string): ProjectEntry | undefined {
  return allProjects.find((p) => p.slug === slug)
}

/** Warmth for a project: its chapter's, or the warm end for side projects. */
export function warmthOf(project: ProjectEntry): number {
  return chapterOf(project)?.warmth ?? 0.08
}

export const featured: ProjectEntry[] = (caseStudiesJson.featured as string[])
  .map(projectBySlug)
  .filter((p): p is ProjectEntry => Boolean(p))

/** Cities in the order the work first came from them. */
export const route: { place: Place; year: number }[] = (() => {
  const seen = new Set<string>()
  const out: { place: Place; year: number }[] = []
  for (const chapter of chapters) {
    if (!chapter.place || seen.has(chapter.place.city)) continue
    seen.add(chapter.place.city)
    out.push({ place: chapter.place, year: yearOf(chapter.start) })
  }
  return out
})()

/** The cloth: one strip per chapter, oldest on the left. */
export const clothPatterns: PatternId[] = chapters.map((c) => c.strip.pattern)

/** The strip a project was woven in. Side projects borrow the first. */
export function patternOf(project: ProjectEntry): PatternId {
  return chapterOf(project)?.strip.pattern ?? clothPatterns[0] ?? 'ahwepan'
}

/* ------------------------------------------------------------------ */
/* Weights: Asante gold weights paired with project metrics            */
/* ------------------------------------------------------------------ */

export type Weight = {
  id: string
  image: string
  width: number
  height: number
  title: string
  maker: string
  date: string
  accession: string
  credit: string
  url: string
  note?: string
  project: ProjectEntry
  metric: { value: string; label: string }
}

export const weightsIntro = weightsJson.intro

export const weights: Weight[] = weightsJson.weights.flatMap((w) => {
  const project = projectBySlug(w.project)
  const metric = project?.study?.metric
  return project && metric ? [{ ...w, project, metric }] : []
})

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */

export type ContactPoint = {
  id: string
  label: string
  handle: string
  href: string
}

/**
 * Built rather than declared, so a missing entry removes a link instead of
 * leaving one pointing at nothing. The résumé link exists only while
 * `contact.resume` is set in about.json, and the PDF has to be in /public.
 */
export const contactPoints: ContactPoint[] = (() => {
  const contact = about.contact
  const points: ContactPoint[] = []
  if (contact?.email) {
    points.push({ id: 'email', label: 'Email', handle: contact.email, href: `mailto:${contact.email}` })
  }
  if (contact?.phone) {
    points.push({
      id: 'phone',
      label: 'Phone',
      handle: contact.phone,
      href: `tel:${contact.phone.replace(/[^\d+]/g, '')}`,
    })
  }
  for (const link of contact?.links ?? []) {
    points.push({
      id: link.label.toLowerCase(),
      label: link.label.charAt(0) + link.label.slice(1).toLowerCase(),
      handle: link.handle,
      href: link.href,
    })
  }
  if (contact?.resume) {
    points.push({ id: 'resume', label: 'Résumé', handle: 'PDF', href: contact.resume })
  }
  return points
})()

export const email = about.contact?.email ?? ''
/** Where Kevin is based, as opposed to where the work has come from. */
export const location = about.location ?? ''
export const resume = about.contact?.resume ?? ''

/** Accent for a warmth: gold in the Kumasi half, harbour in the Boston half. */
export function accentOf(warmth: number): 'gold' | 'harbour' {
  return warmth < 0.5 ? 'gold' : 'harbour'
}
