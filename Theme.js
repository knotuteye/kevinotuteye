/**
 * Design tokens for the "Kumasi → Boston" direction, consumed in three places:
 *   - tailwind.config.js at build time (every class in the DOM)
 *   - lib/weave.ts at runtime (the CSS weave and the WebGL weave)
 *   - pages/api/og.tsx (the share card)
 *
 * Kente colours carry meaning, so each one has a job. The UI uses only ink,
 * cotton, gold and harbour. Indigo, leaf and red live in the weave and are never
 * used for buttons or body text. Red in particular is never an error colour.
 *
 * Contrast (WCAG): cotton on ink 15.6:1, gold on ink 8.7:1, harbour on ink
 * 7.9:1, indigo on cotton 7.1:1. Gold fails on cotton (1.8:1), so it is only a
 * fill in reading mode.
 */
module.exports = {
  colors: {
    // Grounds and text
    ink: '#15120F', // ground; black: maturity, spiritual energy
    cotton: '#F1EADB', // text on ink, ground in reading mode; undyed thread

    // UI accents. The accent follows the chapter: gold early, harbour late.
    gold: '#E3A62F', // Kumasi; gold: royalty, wealth, high standing
    harbour: '#8FA8E0', // Boston; indigo lifted so it can be text on ink

    // Weave threads (fills only, except indigo as text on cotton)
    indigo: '#2B4A8C', // blue: peace, harmony
    leaf: '#2F6B45', // green: growth, harvest, renewal
    red: '#B23A2A', // red: sacrifice, strong feeling

    // Neutrals, each checked for contrast on its ground
    seam: '#3A332B', // hairlines on ink; body text on cotton (10.4:1)
    soft: '#B5AC9C', // secondary text on ink (8.3:1)
    muted: '#A89F90', // labels on ink (7.1:1)
    umber: '#5E564B', // labels on cotton (6.0:1)
  },
}
