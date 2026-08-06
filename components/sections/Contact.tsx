import { contactPoints } from '../../lib/content'
import { colorAt } from '../../lib/palette'
import PageContainer from '../elements/PageContainer'
import PageHeading from '../elements/PageHeading'

/**
 * The contact page, as real HTML.
 *
 * This is the layer crawlers, no-JS visitors and reduced-motion visitors get,
 * and for this route in particular it is the one that has to be right: a
 * portfolio can afford a project list that only exists inside a WebGL canvas,
 * and it cannot afford an address that does. Both layers read the same
 * `contactPoints`, so there is no second copy of the links to fall out of date.
 */
export default function Contact() {
  return (
    <PageContainer>
      <PageHeading
        title="Contact"
        svgPath="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />

      <p className="font-body md:pl-6 md:max-w-2xl text-sm md:text-base">
        {
          'Open to senior full-stack and platform roles, and always happy to talk about healthcare systems, cloud architecture or music.'
        }
      </p>

      <ul className="flex flex-col gap-y-4 py-8 md:pl-6">
        {contactPoints.map((point, index) => (
          <li key={point.id} className="flex items-baseline gap-x-4">
            <span
              className="font-heading text-xs uppercase tracking-widest w-24 shrink-0"
              style={{ color: colorAt(index) }}
            >
              {point.label}
            </span>
            <a
              href={point.href}
              // Only outbound links get a new tab. A mailto opening one leaves a
              // blank window behind the mail client, and the résumé is a file on
              // this origin that the browser already knows how to handle.
              target={point.href.startsWith('http') ? '_blank' : undefined}
              rel={point.href.startsWith('http') ? 'noreferrer' : undefined}
              className="font-body text-sm md:text-base text-queenBlue underline underline-offset-4 hover:text-redSalsa break-all"
            >
              {point.handle}
            </a>
          </li>
        ))}
      </ul>
    </PageContainer>
  )
}
