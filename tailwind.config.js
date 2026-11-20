const { themes, fixed } = require('./Theme')

/** Theme roles read CSS variables (set in styles/globals.css), so opacity modifiers still work. */
const roles = Object.fromEntries(
  Object.keys(themes.light).map((name) => [name, `rgb(var(--c-${name}) / <alpha-value>)`])
)

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors: {
      ...roles,
      ...fixed,
      transparent: 'transparent',
      current: 'currentColor',
    },
    // The variables are set by next/font in lib/fonts.ts.
    fontFamily: {
      serif: ['var(--font-serif)', 'Times New Roman', 'serif'],
      sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
    },
    extend: {
      transitionTimingFunction: {
        // "Beat": the beater swung home. The one curve used across the site.
        beat: 'cubic-bezier(0.76, 0, 0.24, 1)',
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      maxWidth: {
        page: '1600px',
      },
    },
  },
  plugins: [],
}
