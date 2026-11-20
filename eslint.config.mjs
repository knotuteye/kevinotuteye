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
  ]),
])
