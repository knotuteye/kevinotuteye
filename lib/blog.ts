import fs from 'node:fs'
import path from 'node:path'

/**
 * The journal: Markdown files in content/posts, read at build time only (from
 * getStaticProps), so nothing here reaches the browser.
 *
 * The Markdown is a deliberate subset, parsed into plain data and rendered by
 * components/Prose.tsx without innerHTML: ## and ### headings, paragraphs,
 * fenced code, - and 1. lists, > callouts, and inline `code`, **strong**,
 * *em* and [links](url). Anything else is printed as text.
 */

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'code'; v: string }
  | { t: 'strong'; v: string }
  | { t: 'em'; v: string }
  | { t: 'link'; v: string; href: string }

export type Block =
  | { type: 'h2' | 'h3'; id: string; text: Inline[] }
  | { type: 'p' | 'quote'; text: Inline[] }
  | { type: 'code'; lang: string; code: string }
  | { type: 'ul' | 'ol'; items: Inline[][] }

export type PostMeta = {
  slug: string
  title: string
  /** ISO date, YYYY-MM-DD. */
  date: string
  /** "5 Nov 2026", formatted here so pages never import this module (it uses fs). */
  dateLabel: string
  summary: string
  tags: string[]
  /** Where the code lives, for the "From" line. Free text. */
  source: string
  minutes: number
}

export type Post = PostMeta & { blocks: Block[] }

const DIR = path.join(process.cwd(), 'content', 'posts')

function frontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!match) return { data: {}, body: raw }
  const data: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const at = line.indexOf(':')
    if (at > 0) data[line.slice(0, at).trim()] = line.slice(at + 1).trim()
  }
  return { data, body: raw.slice(match[0].length) }
}

const INLINE = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g

export function inline(text: string): Inline[] {
  const out: Inline[] = []
  let last = 0
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push({ t: 'text', v: text.slice(last, m.index) })
    if (m[1] !== undefined) out.push({ t: 'code', v: m[1] })
    else if (m[2] !== undefined) out.push({ t: 'strong', v: m[2] })
    else if (m[3] !== undefined) out.push({ t: 'em', v: m[3] })
    else out.push({ t: 'link', v: m[4], href: m[5] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) })
  return out
}

const slugOf = (text: string) =>
  text
    .toLowerCase()
    .replace(/[`*]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export function parse(body: string): Block[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    const fence = line.match(/^```(\w*)/)
    if (fence) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++])
      i++
      blocks.push({ type: 'code', lang: fence[1], code: code.join('\n') })
      continue
    }
    const heading = line.match(/^(#{2,3}) (.+)/)
    if (heading) {
      const text = heading[2].trim()
      blocks.push({ type: heading[1].length === 2 ? 'h2' : 'h3', id: slugOf(text), text: inline(text) })
      i++
      continue
    }
    if (/^(- |\d+\. )/.test(line)) {
      const ordered = /^\d+\. /.test(line)
      const items: string[] = []
      while (i < lines.length && lines[i].trim()) {
        const item = lines[i].match(/^(?:- |\d+\. )(.*)/)
        if (item) items.push(item[1])
        else items[items.length - 1] += ' ' + lines[i].trim()
        i++
      }
      blocks.push({ type: ordered ? 'ol' : 'ul', items: items.map(inline) })
      continue
    }
    const quote = line.startsWith('> ')
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(```|#{2,3} |- |\d+\. )/.test(lines[i]) &&
      lines[i].startsWith('> ') === quote
    ) {
      para.push(quote ? lines[i].slice(2) : lines[i])
      i++
    }
    blocks.push({ type: quote ? 'quote' : 'p', text: inline(para.join(' ').trim()) })
  }
  return blocks
}

function minutesOf(body: string) {
  const words = body.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 230))
}

function read(file: string): Post {
  const raw = fs.readFileSync(path.join(DIR, file), 'utf8')
  const { data, body } = frontmatter(raw)
  return {
    slug: file.replace(/\.md$/, ''),
    title: data.title ?? file,
    date: data.date ?? '',
    dateLabel: formatDate(data.date ?? ''),
    summary: data.summary ?? '',
    tags: (data.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean),
    source: data.source ?? '',
    minutes: minutesOf(body),
    blocks: parse(body),
  }
}

/** Newest first. */
export function allPosts(): Post[] {
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.md'))
    .map(read)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** A post without its body, for lists and links. */
export function metaOf(post: Post): PostMeta {
  const { blocks, ...meta } = post
  void blocks
  return meta
}

export function postMetas(): PostMeta[] {
  return allPosts().map(metaOf)
}

export function postBySlug(slug: string): Post | undefined {
  return allPosts().find((p) => p.slug === slug)
}

/** "2026-11-05" → "5 Nov 2026", without time-zone drift. */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d} ${months[m - 1]} ${y}`
}
