import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  const id = setInterval(callback, 10_000)
  return () => clearInterval(id)
}

const minuteNow = () => Math.floor(Date.now() / 60_000)
// The server cannot know when the page will be read, so it renders a
// placeholder and the client fills it in after hydration.
const minuteOnServer = () => 0

function format(minute: number, timeZone: string) {
  if (!minute) return '--:--'
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone }).format(
    new Date(minute * 60_000)
  )
}

/** Live local time at both ends of the thread. */
export default function Clocks({ className = '' }: { className?: string }) {
  const minute = useSyncExternalStore(subscribe, minuteNow, minuteOnServer)
  return (
    <p className={`t-label flex gap-5 ${className}`}>
      <span>
        <span className="text-accent">Kumasi</span>{' '}
        <time className="text-soft">{format(minute, 'Africa/Accra')}</time>
      </span>
      <span>
        <span className="text-accent2">Boston</span>{' '}
        <time className="text-soft">{format(minute, 'America/New_York')}</time>
      </span>
    </p>
  )
}
