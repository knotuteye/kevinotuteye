const colors = require('tailwindcss/colors')

module.exports = {
  mode: 'jit',
  purge: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
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
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
