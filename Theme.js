/**
 * Design tokens, consumed in two places:
 *   - tailwind.config.js at build time (the DOM / fallback layer)
 *   - three.js materials at runtime (the 3D world)
 *
 * That dual consumption is deliberate: change a hex here and both the fallback
 * site and every object in the world reskin together.
 */
module.exports = {
  colors: {
    redSalsa: '#f94144', // accent objects, "now" markers
    orangeRed: '#f3722c', // floor gradient — top left
    yellowOrange: '#f8961e', // floor gradient — bottom left
    maizeCrayola: '#f9c74f', // floor gradient — bottom right
    pistachio: '#90be6d', // matcap variant
    zomp: '#43aa8b', // matcap variant
    queenBlue: '#577590', // matcap variant
  },

  /**
   * World-only tokens. `indirect` does triple duty — it is the shadow color, the
   * floor-shadow color, AND the fake bounce-light color. One value tying the
   * whole scene together chromatically is the single cheapest trick in the
   * reference site.
   */
  world: {
    floorTopRight: '#ff9043',
    indirect: '#d04500',
    glow: '#ffcfe0',
    bone: '#f4efe6', // default object color, matte off-white
  },

  fontFamily: {
    heading: ['Montserrat', 'sans-serif'],
    body: ['Raleway', 'sans-serif'],
  },
}
