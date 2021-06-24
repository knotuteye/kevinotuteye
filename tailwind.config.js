const colors = require('tailwindcss/colors')
const theme = require('./Theme')

module.exports = {
  mode: 'jit',
  purge: {
    enabled: true,
    content: [
      './pages/**/*.{js,ts,jsx,tsx}',
      './components/**/*.{js,ts,jsx,tsx}',
      './Theme.js',
    ],
    safelist: Object.keys(theme.colors)
      .map((x) => `text-${x}`)
      .concat(Object.keys(theme.colors).map((x) => `bg-${x}`)),
  },
  darkMode: false, // or 'media' or 'class'
  theme: {
    colors: {
      ...theme.colors,
      white: colors.white,
    },
    fontFamily: {
      ...theme.fontFamily,
    },
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
