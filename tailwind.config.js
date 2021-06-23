const colors = require('tailwindcss/colors')
const theme = require('./Theme')

module.exports = {
  purge: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './sections/**/*.{js,ts,jsx,tsx}',
  ],
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
