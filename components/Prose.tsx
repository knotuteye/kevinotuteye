import type { Block, Inline } from '../lib/blog'

function Text({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((part, i) => {
        switch (part.t) {
          case 'code':
            return (
              <code key={i} className="rounded-[3px] bg-loom px-[0.35em] py-[0.1em] font-mono text-[0.86em]">
                {part.v}
              </code>
            )
          case 'strong':
            return (
              <strong key={i} className="font-semibold text-fg">
                {part.v}
              </strong>
            )
          case 'em':
            return <em key={i}>{part.v}</em>
          case 'link': {
            const external = /^https?:/.test(part.href)
            return (
              <a
                key={i}
                href={part.href}
                {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
                className="text-accent2 underline decoration-1 underline-offset-[3px] hover:decoration-2"
              >
                {part.v}
                {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
              </a>
            )
          }
          default:
            return <span key={i}>{part.v}</span>
        }
      })}
    </>
  )
}

/** A post body: a reading column, with code allowed to run wider. */
export default function Prose({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-6 text-[18px] leading-[1.7] text-soft md:text-[19px]">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h2':
            return (
              <h2 key={i} id={block.id} className="t-title mt-10 scroll-mt-28 text-[clamp(32px,3vw,44px)] text-fg">
                <Text parts={block.text} />
              </h2>
            )
          case 'h3':
            return (
              <h3 key={i} id={block.id} className="mt-4 scroll-mt-28 text-[20px] font-semibold leading-[1.35] text-fg">
                <Text parts={block.text} />
              </h3>
            )
          case 'quote':
            return (
              <blockquote key={i} className="border-l-2 border-accent pl-5 text-fg">
                <Text parts={block.text} />
              </blockquote>
            )
          case 'code':
            return (
              <figure key={i} className="-mx-[var(--gutter)] my-2 md:mx-0">
                <pre className="overflow-x-auto bg-loom px-[var(--gutter)] py-5 font-mono text-[13.5px] leading-[1.65] text-fg md:rounded-md md:px-6">
                  <code>{block.code}</code>
                </pre>
                {block.lang ? (
                  <figcaption className="t-label mt-2 px-[var(--gutter)] text-[10px] text-muted md:px-0">
                    {block.lang}
                  </figcaption>
                ) : null}
              </figure>
            )
          case 'ul':
          case 'ol': {
            const List = block.type
            return (
              <List
                key={i}
                className={`flex flex-col gap-2 pl-6 ${block.type === 'ul' ? 'list-disc' : 'list-decimal'} marker:text-muted`}
              >
                {block.items.map((item, k) => (
                  <li key={k} className="pl-1">
                    <Text parts={item} />
                  </li>
                ))}
              </List>
            )
          }
          default:
            return (
              <p key={i}>
                <Text parts={block.text} />
              </p>
            )
        }
      })}
    </div>
  )
}
