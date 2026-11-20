import { useSyncExternalStore } from 'react'
import { getServerTheme, getTheme, setTheme, subscribeTheme } from '../../lib/theme'

/** Cotton (light) or ink (dark). The swatch shows the ground you would switch to. */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getServerTheme)
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next === 'dark' ? 'dark' : 'light'} theme`}
      className={`t-label inline-flex h-11 items-center gap-3 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`h-3 w-3 rounded-full border border-current ${next === 'dark' ? 'bg-night' : 'bg-paper'}`}
      />
      <span>{theme === 'dark' ? 'Ink' : 'Cotton'}</span>
    </button>
  )
}
