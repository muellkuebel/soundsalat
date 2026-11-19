export function SaladMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" aria-hidden="true">
      <path fill="#3e9d48" d="M256 58c34 36 78 40 118 78 42 40 78 96 70 162-8 70-58 128-112 156-22 12-40 40-76 58-36-18-54-46-76-58-54-28-104-86-112-156-8-66 28-122 70-162 40-38 84-42 118-78z" />
      <path fill="none" stroke="#2c7a38" strokeWidth="18" strokeLinecap="round" d="M256 108c-6 78-4 168 2 292" />
      <g fill="#f7fbf4">
        <ellipse cx="236" cy="312" rx="58" ry="40" transform="rotate(-26 236 312)" />
        <rect x="278" y="146" width="22" height="162" rx="8" />
      </g>
      <path d="M300 154c62 20 78 66 36 104" fill="none" stroke="#f7fbf4" strokeWidth="20" strokeLinecap="round" />
    </svg>
  )
}

export function Logo() {
  return (
    <h1 className="logo">
      <SaladMark className="salad-mark" />
      <span className="logo-words" aria-label="Soundsalat">
        <span className="logo-sound" data-text="Sound">
          Sound
        </span>
        <span className="logo-salat" data-text="salat">
          salat
        </span>
      </span>
    </h1>
  )
}
