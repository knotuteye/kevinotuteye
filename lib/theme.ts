/**
 * Light (cotton) or dark (ink). Light is the default; a visitor's choice is
 * remembered in localStorage. The attribute is set before first paint by the
 * inline script in pages/_document.tsx, so this only reads and changes it.
 */
export type Theme = 'light' | 'dark'

const KEY = 'theme'
const listeners = new Set<() => void>()

export const THEME_SCRIPT = `try{var t=localStorage.getItem('${KEY}');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export const getServerTheme = (): Theme => 'light'

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // Private mode or blocked storage: the choice lasts for this page only.
  }
  listeners.forEach((l) => l())
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** A theme colour role as an `rgb()` string, read live from the CSS variables. */
export function themeColor(role: string, alpha = 1): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--c-${role}`).trim()
  return `rgb(${value} / ${alpha})`
}
