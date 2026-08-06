import { useCallback, useMemo } from 'react'
import type { Spawn } from '../../lib/car'
import { SCENERY } from '../../lib/scenery'
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
import CompassProbe from './CompassProbe'
import Dust from './Dust'
import Floor from './Floor'
import Reveal from './Reveal'
import Scatter from './Scatter'
import { shadowAlpha } from './Shadow'
import Signposts from './Signposts'
import Tiles from './Tiles'
import TireTracks from './TireTracks'
import Zone from './Zone'
import AboutSection from './sections/AboutSection'
import Contact from './sections/Contact'
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
      {/* Under the car in the file as well as in the scene: both read the same
          published car state, and neither writes anything the car reads back. */}
      <TireTracks />
      <Dust />
      <Tiles />
      <Signposts />
      {/* Renders nothing — it projects the zones into screen space for the DOM
          compass, and lives here because this is where the camera is. */}
      <CompassProbe />

      <Intro />
      <IntroShadows />
      <ControlKeys />
      <Work />
      <Projects />
      <AboutSection />
      <Contact />

      {ZONE_LIST.filter((z) => z.id !== 'intro').map((zone) => (
        <Zone
          key={zone.id}
          zone={zone}
          onEnter={handleEnter}
          onLeave={handleLeave}
        />
      ))}

      {/* Both fields are solved together in `lib/scenery` — where the props go
          is a question about the whole plain (which ground the copy already
          owns, what is standing there), and answering it one ring at a time is
          what put boulders on the roles and trees inside each other. */}
      {SCENERY.clutter.map((items, i) => (
        <Clutter key={`clutter-${i}`} items={items} />
      ))}
      {SCENERY.scatter.map((items, i) => (
        <Scatter key={`scatter-${i}`} items={items} />
      ))}
    </>
  )
}
