const theme = require('./Theme')

// Tailwind v3: `purge` became `content`, and JIT is the default engine (no `mode` key).
// The safelist stays because several components build class names dynamically
// (`text-${color}` / `bg-${color}`) from Theme.js, which the scanner cannot see.
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './Theme.js',
  ],
  safelist: Object.keys(theme.colors)
    .map((x) => `text-${x}`)
    .concat(Object.keys(theme.colors).map((x) => `bg-${x}`))
    .concat(Object.keys(theme.colors).map((x) => `border-${x}`)),
  darkMode: false,
  theme: {
    colors: {
      ...theme.colors,
      ...theme.world,
      white: '#ffffff',
      black: '#000000',
      transparent: 'transparent',
      current: 'currentColor',
    },
    fontFamily: {
      ...theme.fontFamily,
    },
    extend: {},
  },
  plugins: [],
}
