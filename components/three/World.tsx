import { useRouter } from 'next/router'
import { useCallback, useEffect } from 'react'
import {
  setFocus,
  ZONE_LIST,
  ZONES,
  type Zone as ZoneData,
  type ZoneId,
} from '../../lib/world'
import WorldCamera from './Camera'
import Floor from './Floor'
import Reveal from './Reveal'
import Scatter from './Scatter'
import { shadowAlpha } from './Shadow'
import Zone from './Zone'
import AboutSection from './sections/AboutSection'
import Intro, { IntroShadows } from './sections/Intro'
import Projects from './sections/Projects'
import Work from './sections/Work'

/**
 * Scene contents. There are no lights — every material is a matcap, and the
 * only light-like things in here are the floor gradient, the fake contact
 * shadows, and the bounce term baked into the clay material.
 */
export default function World({ entry }: { entry: ZoneId }) {
  const router = useRouter()

  // Keep the URL in step with the camera so deep links and the back button
  // work, without remounting the canvas.
  const handleActivate = useCallback(
    (zone: ZoneData) => {
      if (router.asPath !== zone.route) {
        router.push(zone.route, undefined, { shallow: true })
      }
    },
    [router]
  )

  // Escape backs out to the overview. Without a scrollbar or a back affordance
  // in the canvas, this is the only way out of a focused zone by keyboard.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setFocus(null)
      if (router.asPath !== ZONES.intro.route) {
        router.push(ZONES.intro.route, undefined, { shallow: true })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router])

  return (
    <>
      <Floor />
      <WorldCamera initial={entry} />
      <Reveal shadowAlpha={shadowAlpha} />

      <Intro />
      <IntroShadows />
      <Work />
      <Projects />
      <AboutSection />

      {ZONE_LIST.filter((z) => z.id !== 'intro').map((zone) => (
        <Zone key={zone.id} zone={zone} onActivate={handleActivate} />
      ))}

      <Scatter center={[0, 2]} seed={11} count={16} innerRadius={12} />
      <Scatter
        center={[34, -36]}
        seed={22}
        count={10}
        radius={34}
        innerRadius={22}
      />
      <Scatter
        center={[-58, -26]}
        seed={33}
        count={10}
        radius={34}
        innerRadius={22}
      />
      <Scatter
        center={[-2, -110]}
        seed={44}
        count={10}
        radius={34}
        innerRadius={22}
      />
    </>
  )
}
