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
