const colors = require('tailwindcss/colors')

module.exports = {
  purge: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './sections/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    fontFamily: {
      heading: ['Montserrat', 'sans-serif'],
      body: ['Raleway', 'sans-serif'],
    },
    extend: {
      colors: {
        redSalsa: '#f94144',
        orangeRed: '#f3722c',
        yellowOrange: '#f8961e',
        maizeCrayola: '#f9c74f',
        pistachio: '#90be6d',
        zomp: '#43aa8b',
        queenBlue: '#577590',
        white: colors.white,
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
