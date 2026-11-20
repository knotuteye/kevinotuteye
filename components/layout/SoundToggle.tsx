import { useSyncExternalStore } from 'react'
import { getServerSound, isSoundOn, setSound, subscribeSound } from '../../lib/sound'

/** Off by default. When on, the loom clacks and strips land with a thud. */
export default function SoundToggle({ className = '' }: { className?: string }) {
  const on = useSyncExternalStore(subscribeSound, isSoundOn, getServerSound)
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setSound(!on)}
      className={`t-label group inline-flex h-11 items-center gap-3 ${className}`}
    >
      <span aria-hidden="true" className="flex h-3 items-end gap-[2px]">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-[2px] bg-current ${on ? 'animate-[sound_900ms_ease-in-out_infinite]' : ''}`}
            style={{ height: on ? undefined : '2px', animationDelay: `${i * 120}ms` }}
          />
        ))}
      </span>
      <span>Sound {on ? 'on' : 'off'}</span>
    </button>
  )
}
