/**
 * Design tokens for "Strip by strip", consumed in four places:
 *   - tailwind.config.js at build time (every class in the DOM)
 *   - lib/kente.ts at runtime (the loom's thread colours)
 *   - components/cloth/Fallback.tsx (the CSS fallback cloth)
 *   - pages/api/og.tsx (the share card)
 *
 * Three families.
 *
 * `themes` are the interface roles, one set per theme. They become CSS
 * variables in styles/globals.css, so a class like `text-muted` follows the
 * theme. Light ("cotton": undyed thread) is the default; dark ("ink") is kept
 * behind the toggle in the header.
 *
 * `fixed` colours never change with the theme: gold as a fill, the dyes used
 * as UI accents, and the two grounds for places that must stay one way.
 *
 * `dyes` are thread colours for the cloth only, tuned to read as dyed silk
 * under a moving light, and never used for text.
 *
 * Contrast (WCAG), light on #F4EFE5: fg 16.1, soft 8.6, muted 5.6, accent 5.4,
 * accent2 7.5. Dark on #100E0B: fg 16.4, soft 8.6, muted 7.2, accent 9.1,
 * accent2 8.2. Gold fails on cotton (1.8:1), so in light it is only a fill.
 */
const themes = {
  light: {
    ground: '#F4EFE5', // page; undyed cotton
    loom: '#EAE3D5', // raised surfaces
    fg: '#17130F', // text
    soft: '#4A4238', // secondary text
    muted: '#675E50', // labels
    seam: '#DAD1BF', // hairlines
    accent: '#8A5508', // gold, deepened so it can be text on cotton
    accent2: '#2B4A8C', // indigo
    shadow: '#3A2A14', // tint for drop shadows
  },
  dark: {
    ground: '#100E0B',
    loom: '#1A1713',
    fg: '#F1EADB',
    soft: '#B5AC9C',
    muted: '#A39A8B',
    seam: '#2E2923',
    accent: '#E3A62F',
    accent2: '#8FA8E0',
    shadow: '#000000',
  },
}

module.exports = {
  themes,

  fixed: {
    gold: '#E3A62F', // Kumasi; gold: royalty, wealth, high standing
    indigo: '#2B4A8C', // blue: peace, harmony
    leaf: '#2F6B45', // green: growth, harvest, renewal
    red: '#B23A2A', // red: sacrifice, strong feeling
    night: '#100E0B', // text on gold, whatever the theme
    paper: '#F1EADB',
  },

  /** For the share card, which is always dark. */
  colors: { ...themes.dark, ink: themes.dark.ground, cotton: themes.dark.fg, gold: '#E3A62F' },

  /** Thread dyes, in the order lib/kente.ts indexes them. */
  dyes: [
    '#16120F', // 0 black
    '#E2A01E', // 1 gold
    '#B4261C', // 2 red
    '#17703F', // 3 green
    '#21408F', // 4 blue
    '#EEE4CD', // 5 white (undyed)
    '#D8621B', // 6 orange
    '#6B1E1A', // 7 maroon
  ],
}
