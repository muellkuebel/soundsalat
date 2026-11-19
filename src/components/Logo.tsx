export function SaladMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 90" aria-hidden="true">
      <g className="note-pop">
        <path d="M78 18v22" stroke="#243024" strokeWidth="3" strokeLinecap="round" />
        <circle cx="72" cy="40" r="6" fill="#243024" />
        <path d="M92 10v18" stroke="#243024" strokeWidth="3" strokeLinecap="round" />
        <circle cx="86" cy="28" r="5" fill="#e23d3d" />
      </g>
      <path d="M34 30c6-16 22-18 28-8 6-8 18-8 24 2 10 2 16 10 14 18" fill="#8bc34a" stroke="#245c28" strokeWidth="3" strokeLinejoin="round" />
      <path d="M22 46h76c-4 18-20 28-38 28S26 64 22 46Z" fill="#f4f8ef" stroke="#245c28" strokeWidth="3" />
      <ellipse cx="46" cy="40" rx="10" ry="8" fill="#e23d3d" stroke="#8d2020" strokeWidth="2" />
      <ellipse cx="66" cy="38" rx="11" ry="7" fill="#7cb342" stroke="#2f6b22" strokeWidth="2" />
      <circle cx="58" cy="48" r="6" fill="#f2c014" stroke="#8a6a00" strokeWidth="2" />
      <path d="M30 46h60" stroke="#245c28" strokeWidth="3" strokeLinecap="round" />
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
