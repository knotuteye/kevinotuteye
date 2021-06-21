const colors = require('tailwindcss/colors')

module.exports = {
  purge: [],
  darkMode: false, // or 'media' or 'class'
  theme: {
    colors: {
      navyBlue: '#03045e',
      starBlue: '#0077b6',
      ceruleanCrayola: '#00b4d8',
      skyBlueCrayola: '#90e0ef',
      powderBlue: '#caf0f8',
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
