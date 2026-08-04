import { useCallback, useMemo } from 'react'
import type { Spawn } from '../../lib/car'
import {
  INTRO_SPAWN,
  WORLD_YAW,
  ZONE_LIST,
  ZONES,
  type Zone as ZoneData,
  type ZoneId,
} from '../../lib/world'
import Car from './Car'
import WorldCamera from './Camera'
import ControlKeys, { Clutter } from './Clutter'
import Floor from './Floor'
import Reveal from './Reveal'
import Scatter from './Scatter'
import { shadowAlpha } from './Shadow'
import Signposts from './Signposts'
import Tiles from './Tiles'
import Zone from './Zone'
import AboutSection from './sections/AboutSection'
import Intro, { IntroShadows } from './sections/Intro'
import Projects from './sections/Projects'
import Work from './sections/Work'

/**
 * Scene contents. There are no lights — every material is a matcap, and the
 * only light-like things in here are the floor gradient, the fake contact
 * shadows, and the bounce term baked into the clay material.
 *
 * Navigation is the car. Nothing in the world is clickable; you drive to a zone
 * and arriving is what changes the URL.
 */

/**
 * Writes the address bar without telling the router.
 *
 * `router.push` cannot be used here, shallow or otherwise. `_app` renders
 * `<Component {...pageProps} />`, so a route change swaps the page component's
 * identity, and React unmounts the subtree — canvas, physics world, car and all
 * — to mount the next one. Clicking a zone could just about survive that. A car
 * that respawns every time it crosses a boundary cannot.
 *
 * `replaceState` rather than `pushState`: crossing a zone edge twice while
 * parking should not leave two entries in the user's history.
 */
function syncUrl(route: string) {
  if (typeof window === 'undefined') return
  if (window.location.pathname === route) return
  window.history.replaceState(window.history.state, '', route)
}

export default function World({ entry }: { entry: ZoneId }) {
  const spawn = useMemo<Spawn>(
    () => ({
      // A deep link drops the car at that zone's entrance rather than at its
      // content: arriving is the same act however you got there.
      position: entry === 'intro' ? INTRO_SPAWN : ZONES[entry].position,
      // Pointed down the section's own axis. Every section is laid out inside a
      // group yawed by WORLD_YAW, so a car facing world -z would set off at 38°
      // to the column of content it is parked at the top of and drive straight
      // out the side of it. At the intro there is no axis to follow — the name
      // is simply ahead.
      heading: entry === 'intro' ? 0 : WORLD_YAW,
    }),
    [entry]
  )

  const handleEnter = useCallback((zone: ZoneData) => syncUrl(zone.route), [])
  const handleLeave = useCallback(() => syncUrl(ZONES.intro.route), [])

  return (
    <>
      <Floor />
      <WorldCamera entry={entry} />
      <Reveal shadowAlpha={shadowAlpha} />

      <Car spawn={spawn} />
      <Tiles />
      <Signposts />

      <Intro />
      <IntroShadows />
      <ControlKeys />
      <Work />
      <Projects />
      <AboutSection />

      {ZONE_LIST.filter((z) => z.id !== 'intro').map((zone) => (
        <Zone
          key={zone.id}
          zone={zone}
          onEnter={handleEnter}
          onLeave={handleLeave}
        />
      ))}

      {/* Loose stuff, kept to the approaches rather than spread everywhere. A
          field of knockable props by every marker would turn arriving at a
          section into an obstacle course; near the intro and on the runs out to
          each zone, it is the reason to take the long way round. */}
      <Clutter center={[0, 4]} seed={101} count={14} innerRadius={7} radius={16} />
      <Clutter center={[30, -8]} seed={102} count={10} innerRadius={6} radius={15} />
      <Clutter center={[-32, -14]} seed={103} count={10} innerRadius={6} radius={15} />
      <Clutter center={[0, -55]} seed={104} count={10} innerRadius={6} radius={15} />

      {/* Denser than it was, and over more centres.
          Forty-six props across a map a hundred metres deep left long stretches
          of bare gradient, which is what made this read as a diagram of a place
          rather than a place. The extra centres matter more than the extra
          counts: four rings of scenery still leaves everything between them
          empty, and the drive between markers is most of the time anyone
          spends here. */}
      <Scatter center={[0, 2]} seed={11} count={22} innerRadius={13} />
      <Scatter
        center={[34, -36]}
        seed={22}
        count={16}
        radius={34}
        innerRadius={20}
      />
      <Scatter
        center={[-58, -26]}
        seed={33}
        count={16}
        radius={34}
        innerRadius={20}
      />
      <Scatter
        center={[-2, -110]}
        seed={44}
        count={16}
        radius={34}
        innerRadius={20}
      />

      {/* The corridors between sections, which had nothing in them at all. */}
      <Scatter center={[28, 6]} seed={55} count={12} radius={24} innerRadius={11} />
      <Scatter center={[-30, -2]} seed={66} count={12} radius={24} innerRadius={11} />
      <Scatter center={[8, -56]} seed={77} count={14} radius={26} innerRadius={12} />
      <Scatter center={[-36, -74]} seed={88} count={12} radius={26} innerRadius={12} />
    </>
  )
}
