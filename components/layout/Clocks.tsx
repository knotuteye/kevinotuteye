import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  const id = setInterval(callback, 10_000)
  return () => clearInterval(id)
}

const minuteNow = () => Math.floor(Date.now() / 60_000)
// The server has no idea what time the visitor will read the page, so it
// renders a placeholder and the client fills it in after hydration.
const minuteOnServer = () => 0

function format(minute: number, timeZone: string) {
  if (!minute) return '--:--'
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(minute * 60_000))
}

/** Live local time at both ends of the route. */
export default function Clocks({
  tone = 'ink',
  className = '',
}: {
  tone?: 'ink' | 'cotton'
  className?: string
}) {
  const minute = useSyncExternalStore(subscribe, minuteNow, minuteOnServer)
  const cotton = tone === 'cotton'
  return (
    <p className={`t-label flex gap-5 ${className}`}>
      <span>
        <span className={cotton ? 'text-indigo' : 'text-gold'}>Kumasi</span>{' '}
        <time className={cotton ? 'text-umber' : 'text-soft'}>
          {format(minute, 'Africa/Accra')}
        </time>
      </span>
      <span>
        <span className={cotton ? 'text-indigo' : 'text-harbour'}>Boston</span>{' '}
        <time className={cotton ? 'text-umber' : 'text-soft'}>
          {format(minute, 'America/New_York')}
        </time>
      </span>
    </p>
  )
}
