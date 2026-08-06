import aboutJson from '../public/json/about.json'
import experienceJson from '../public/json/experience.json'
import projectsJson from '../public/json/projects.json'

/**
 * Single source of truth for site copy, shared by the DOM fallback and the 3D
 * world. The JSON is statically imported (resolveJsonModule), so it is inlined
 * at build time and server-rendered — which is what keeps the fallback layer
 * crawler-readable without any data fetching.
 *
 * Editing public/json/*.json changes both layers. No texture rebuild, which is
 * the trap the reference site fell into by baking its copy into alpha maps.
 */

export type Project = {
  name: string
  link: string
  about: string
  technologies: string[]
  /**
   * A screenshot for the project's board in the world, as a path under
   * `public` — e.g. `/img/projects/kronos.jpg`.
   *
   * Optional, and a board without one is not a broken board: it falls back to a
   * typographic plate built from the project's own initials. That fallback is
   * deliberately not a fake screenshot. A board showing a stock dashboard image
   * would be a claim about work that was never done, and the whole row would
   * stop being evidence.
   *
   * Landscape crops read best — the face is 4.2 x 2.6, and anything is
   * cover-fitted to that rather than squashed.
   */
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

export const experience = experienceJson.experience as Role[]
export const projects = projectsJson.projects as Project[]
export const about = aboutJson

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */

/**
 * One way of reaching Kevin, flattened into the shape both layers render.
 *
 * `handle` and `href` are separate because they are different claims: the href
 * has to be correct and the handle has to be *readable* on a plinth from six
 * metres away, and "https://www.linkedin.com/in/kevinotuteye/" is neither short
 * nor informative. Nothing derives one from the other, because every attempt to
 * do so is a regex that gets a URL wrong eventually.
 */
export type ContactPoint = {
  id: string
  /** Short all-caps name for the plinth and the prompt — "EMAIL", "GITHUB". */
  label: string
  /** What is shown under it. */
  handle: string
  href: string
}

/**
 * Built rather than declared so that a missing entry removes a plinth instead
 * of leaving one pointing at nothing.
 *
 * The résumé is the case that matters: linking a PDF that is not in `public`
 * yet is a 404 on the one page a recruiter is most likely to open, so the
 * plinth exists only while `contact.resume` is set. Clearing that key in the
 * JSON is the whole of the fix, and the row closes up on its own.
 */
export const contactPoints: ContactPoint[] = (() => {
  const contact = about.contact
  const points: ContactPoint[] = []

  if (contact?.email) {
    points.push({
      id: 'email',
      label: 'EMAIL',
      handle: contact.email,
      href: `mailto:${contact.email}`,
    })
  }

  for (const link of contact?.links ?? []) {
    points.push({
      id: link.label.toLowerCase(),
      label: link.label,
      handle: link.handle,
      href: link.href,
    })
  }

  if (contact?.resume) {
    points.push({
      id: 'resume',
      label: 'RÉSUMÉ',
      handle: 'PDF',
      href: contact.resume,
    })
  }

  return points
})()

/** Splits a "COMPANY, CITY, ST" string into its parts for display. */
export function splitCompany(company: string): {
  name: string
  location: string
} {
  const [name, ...rest] = company.split(',')
  return { name: name.trim(), location: rest.join(',').trim() }
}

/** Wraps text to a column width, for laying prose out as ground decals. */
export function wrap(text: string, maxChars: number, maxLines = 4): string {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (candidate.length > maxChars && line) {
      lines.push(line)
      line = word
      if (lines.length === maxLines) break
    } else {
      line = candidate
    }
  }
  if (lines.length < maxLines && line) lines.push(line)

  const joined = lines.join('\n')
  return lines.length === maxLines && joined.length < text.length
    ? `${joined}…`
    : joined
}
