const colors = require('tailwindcss/colors')
const theme = require('./Theme')

module.exports = {
  purge: {
    content: [
      './pages/**/*.{js,ts,jsx,tsx}',
      './components/**/*.{js,ts,jsx,tsx}',
    ],
    options: {
      whitelist: Object.keys(theme.colors)
        .map((x) => `text-${x}`)
        .concat(Object.keys(theme.colors).map((x) => `bg-${x}`)),
    },
  },
  darkMode: false, // or 'media' or 'class'
  theme: {
    colors: {
      ...theme.colors,
      white: colors.white,
    },
    fontFamily: {
      heading: ['Montserrat', 'sans-serif'],
      body: ['Raleway', 'sans-serif'],
    },
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
