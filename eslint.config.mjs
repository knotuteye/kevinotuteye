import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

/**
 * Flat config, which is the only config ESLint 10 reads — `.eslintrc` was
 * dropped, and `next lint` went with it in Next 16, so `eslint .` is the whole
 * lint story now.
 */
export default defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    /**
     * The scene graph is mutable on purpose.
     *
     * `react-hooks/immutability` assumes React owns every value a component
     * touches, which is true of state and false of a three.js object: the
     * canonical react-three-fiber frame loop writes positions, uniforms and
     * material opacities straight onto objects that were memoised at mount,
     * precisely so those writes never reach React. Rewriting that to satisfy
     * the rule would mean a re-render per frame — the exact cost the pattern
     * exists to avoid — so the rule is off for the world and left on
     * everywhere else, where it is right.
     */
    files: ['components/three/**/*.{ts,tsx}'],
    rules: { 'react-hooks/immutability': 'off' },
  },

  {
    // Tailwind and PostCSS read their configs through `require`.
    files: ['*.config.js', 'Theme.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },

  // Spreading a Next config also spreads its ignores, so they have to be
  // restated here rather than inherited.
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'public/draco/**',
  ]),
])
