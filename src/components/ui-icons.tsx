const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const icons = {
  home: (
    <>
      <path d="M4 11.5 12 4l8 7.5" {...common} />
      <path d="M7 10.5V20h10v-9.5" {...common} />
    </>
  ),
  share: (
    <>
      <path d="M12 4v10" {...common} />
      <path d="M8 7.5 12 3.5l4 4" {...common} />
      <path d="M6 12.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-6.5" {...common} />
    </>
  ),
  stop: <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />,
  play: <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" />,
  pause: (
    <>
      <rect x="7" y="5" width="3.2" height="14" rx="1" fill="currentColor" />
      <rect x="13.8" y="5" width="3.2" height="14" rx="1" fill="currentColor" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="11" height="11" rx="2" {...common} />
      <path d="M6 15.5V6.5A1.5 1.5 0 0 1 7.5 5H15" {...common} />
    </>
  ),
  lock: (
    <>
      <rect x="6" y="11" width="12" height="8" rx="2" {...common} />
      <path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" {...common} />
    </>
  ),
  unlock: (
    <>
      <rect x="6" y="11" width="12" height="8" rx="2" {...common} />
      <path d="M8.5 11V8.5a3.5 3.5 0 0 1 6.2-2.2" {...common} />
    </>
  ),
  scissors: (
    <>
      <circle cx="7" cy="7" r="2.2" {...common} />
      <circle cx="7" cy="17" r="2.2" {...common} />
      <path d="M9 8.5 19 16M9 15.5 19 8" {...common} />
    </>
  ),
  trash: (
    <>
      <path d="M5 7h14" {...common} />
      <path d="M9 7V5h6v2" {...common} />
      <path d="M7.5 7l.8 12h7.4l.8-12" {...common} />
    </>
  ),
  check: <path d="M5 12.5 10 17l9-10" {...common} />,
  close: (
    <>
      <path d="M6 6l12 12" {...common} />
      <path d="M18 6 6 18" {...common} />
    </>
  ),
  redo: (
    <>
      <path d="M19 8v5h-5" {...common} />
      <path d="M18 13a6.5 6.5 0 1 0 1.2 3.5" {...common} />
    </>
  ),
  speaker: (
    <>
      <path d="M4 10h3l4-3v10l-4-3H4v-4Z" fill="currentColor" />
      <path d="M14 9.5a3.5 3.5 0 0 1 0 5" {...common} />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" {...common} />
      <path d="M5 12h14" {...common} />
    </>
  ),
  chevronLeft: <path d="M14 5 8 12l6 7" {...common} />,
  chevronRight: <path d="M10 5l6 7-6 7" {...common} />,
}

export type UiIconName = keyof typeof icons

export function UiIcon({ name }: { name: UiIconName }) {
  return (
    <svg viewBox="0 0 24 24" className="ui-icon" aria-hidden="true">
      {icons[name]}
    </svg>
  )
}

export function IconButton({
  label,
  name,
  tone = 'light',
  disabled,
  pressed,
  onClick,
}: {
  label: string
  name: UiIconName
  tone?: 'light' | 'dark' | 'danger'
  disabled?: boolean
  pressed?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      className={`icon-btn ${tone}`}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      <UiIcon name={name} />
    </button>
  )
}
