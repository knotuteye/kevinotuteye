const theme = require('./Theme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors: {
      ...theme.colors,
      transparent: 'transparent',
      current: 'currentColor',
    },
    // The variables are set by next/font in lib/fonts.ts.
    fontFamily: {
      display: ['var(--font-archivo)', 'Arial Narrow', 'sans-serif'],
      sans: ['var(--font-instrument)', 'system-ui', 'sans-serif'],
      mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
    },
    extend: {
      transitionTimingFunction: {
        // "Loom": the one curve used across the whole site.
        loom: 'cubic-bezier(0.7, 0, 0.2, 1)',
      },
      maxWidth: {
        page: '1440px',
      },
    },
  },
  plugins: [],
}
