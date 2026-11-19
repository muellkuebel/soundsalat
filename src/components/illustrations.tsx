import type { ReactNode } from 'react'
import type { IconName } from '../types.ts'

const ink = '#2c2c2c'

function Art({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      {children}
    </svg>
  )
}

const arts: Record<IconName, ReactNode> = {
  mic: (
    <Art>
      <rect x="24" y="8" width="16" height="28" rx="8" fill="#f4f8ef" stroke={ink} strokeWidth="3" />
      <path d="M20 30a12 12 0 0 0 24 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M32 42v8M24 52h16" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="20" r="3" fill="#e23d3d" />
    </Art>
  ),
  pumpkin: (
    <Art>
      <path d="M32 14c2-6 9-7 11-4" fill="none" stroke="#3e7d46" strokeWidth="3" strokeLinecap="round" />
      <path d="M14 38c0-12 7-20 18-20s18 8 18 20-6 16-18 16-18-6-18-16Z" fill="#f08a24" stroke={ink} strokeWidth="3" />
      <path d="M32 18v34" stroke="#d86e10" strokeWidth="3" />
      <circle cx="25" cy="36" r="2" fill={ink} />
      <circle cx="39" cy="36" r="2" fill={ink} />
      <path d="M26 44c3 3 9 3 12 0" fill="none" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
    </Art>
  ),
  castle: (
    <Art>
      <path d="M12 28h8v-8h6v8h12v-8h6v8h8v24H12V28Z" fill="#f4f1e6" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M28 52V40h8v12" fill="#e6a80e" stroke={ink} strokeWidth="3" />
      <path d="M16 24V16M24 24V16M40 24V16M48 24V16" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M42 14h8l-2 6h-4l-2-6Z" fill="#e23d3d" stroke={ink} strokeWidth="2" />
    </Art>
  ),
  flame: (
    <Art>
      <path d="M32 8c8 10 4 16 8 22 4 6-2 18-8 22-10 6-20-4-16-16 2-8 8-8 8-16 0-4 2-8 8-12Z" fill="#ef5a28" stroke={ink} strokeWidth="3" />
      <path d="M32 30c4 4 2 8 4 12 2 4-2 10-6 10-6 0-10-6-8-12 2-6 6-4 10-10Z" fill="#f2c014" stroke={ink} strokeWidth="2.5" />
    </Art>
  ),
  crown: (
    <Art>
      <path d="M10 42 16 22l10 10 6-16 6 16 10-10 6 20H10Z" fill="#f2c014" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="18" cy="24" r="2.5" fill="#ee5a96" />
      <circle cx="32" cy="16" r="2.5" fill="#e23d3d" />
      <circle cx="46" cy="24" r="2.5" fill="#7d5bd6" />
    </Art>
  ),
  ball: (
    <Art>
      <circle cx="32" cy="32" r="18" fill="#f7f7f7" stroke={ink} strokeWidth="3" />
      <path d="M32 14v8l7 4 6-6M32 50v-8l-7-4-6 6M16 26l6 4-2 8-8 2M48 26l-6 4 2 8 8 2" fill="none" stroke={ink} strokeWidth="2.4" />
    </Art>
  ),
  clown: (
    <Art>
      <circle cx="32" cy="34" r="16" fill="#ffe6c2" stroke={ink} strokeWidth="3" />
      <path d="M16 30c2-12 30-12 32 0" fill="#ee5a96" stroke={ink} strokeWidth="3" />
      <circle cx="26" cy="34" r="2.2" fill={ink} />
      <circle cx="38" cy="34" r="2.2" fill={ink} />
      <circle cx="32" cy="40" r="4" fill="#e23d3d" stroke={ink} strokeWidth="2" />
      <path d="M26 46c3 3 9 3 12 0" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
    </Art>
  ),
  jolly: (
    <Art>
      <path d="M16 10v44" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M16 12h28l-6 10 6 10H16" fill="#2c2c2c" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="28" cy="20" r="2" fill="#fff" />
      <circle cx="36" cy="20" r="2" fill="#fff" />
      <path d="M27 26c2 2 6 2 8 0" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </Art>
  ),
  rocket: (
    <Art>
      <path d="M32 8c10 8 12 20 10 32H22C20 28 22 16 32 8Z" fill="#7eb6ff" stroke={ink} strokeWidth="3" />
      <circle cx="32" cy="24" r="5" fill="#f4f8ef" stroke={ink} strokeWidth="2.5" />
      <path d="M22 36l-8 8 8-2 2 6 6-12M42 36l8 8-8-2-2 6-6-12" fill="#e23d3d" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M28 46h8l-4 8-4-8Z" fill="#f2c014" stroke={ink} strokeWidth="2" />
    </Art>
  ),
  skate: (
    <Art>
      <path d="M12 28c8-8 32-8 40 0 2 6-4 10-10 8H20c-6 2-12-2-8-8Z" fill="#7cb342" stroke={ink} strokeWidth="3" />
      <circle cx="22" cy="44" r="5" fill="#f4f1e6" stroke={ink} strokeWidth="3" />
      <circle cx="44" cy="44" r="5" fill="#f4f1e6" stroke={ink} strokeWidth="3" />
    </Art>
  ),
  drum: (
    <Art>
      <ellipse cx="32" cy="24" rx="16" ry="8" fill="#f2c014" stroke={ink} strokeWidth="3" />
      <path d="M16 24v16c0 5 7 9 16 9s16-4 16-9V24" fill="#e23d3d" stroke={ink} strokeWidth="3" />
      <path d="M20 18l8-8M44 16l-6-6" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </Art>
  ),
  stars: (
    <Art>
      <path d="M32 10l3 8h8l-6 5 2 8-7-5-7 5 2-8-6-5h8l3-8Z" fill="#f2c014" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M14 36l2 5h5l-4 3 1.5 5L14 46l-4.5 3L11 44l-4-3h5l2-5Z" fill="#ee5a96" stroke={ink} strokeWidth="2" />
      <path d="M48 38l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4l2-4Z" fill="#7cb342" stroke={ink} strokeWidth="2" />
    </Art>
  ),
  ghost: (
    <Art>
      <path d="M16 32c0-12 7-20 16-20s16 8 16 20v18l-5-4-5 4-6-4-5 4-5-4-6 4V32Z" fill="#f7f7f7" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="26" cy="32" r="2.4" fill={ink} />
      <circle cx="38" cy="32" r="2.4" fill={ink} />
      <circle cx="32" cy="40" r="2" fill="#ee5a96" />
    </Art>
  ),
  pistol: (
    <Art>
      <path d="M8 30h28l8-6v8l6 2v6H36v8H24V40H8V30Z" fill="#3eaf86" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="18" cy="35" r="2" fill="#f2c014" />
      <path d="M46 18l6-4M50 24l8-2" stroke="#e23d3d" strokeWidth="3" strokeLinecap="round" />
    </Art>
  ),
  whistle: (
    <Art>
      <circle cx="22" cy="36" r="10" fill="#d7e4ea" stroke={ink} strokeWidth="3" />
      <path d="M30 32h20l-4 10H32" fill="#f08a24" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="22" cy="36" r="3" fill={ink} />
    </Art>
  ),
  planet: (
    <Art>
      <ellipse cx="32" cy="34" rx="22" ry="8" fill="none" stroke="#f2c014" strokeWidth="3" transform="rotate(-18 32 34)" />
      <circle cx="32" cy="32" r="12" fill="#6a4cb3" stroke={ink} strokeWidth="3" />
      <circle cx="28" cy="28" r="2" fill="#d7c4ff" />
    </Art>
  ),
  bird: (
    <Art>
      <path d="M8 36c10-2 16-10 22-10 4 8 10 10 18 8" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M30 26c8 2 14 8 16 14" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <circle cx="46" cy="22" r="3" fill="#f2c014" stroke={ink} strokeWidth="2" />
    </Art>
  ),
  sword: (
    <Art>
      <path d="M30 8h4l2 30h-8L30 8Z" fill="#e7eef2" stroke={ink} strokeWidth="3" />
      <path d="M22 38h20" stroke="#e6a80e" strokeWidth="4" strokeLinecap="round" />
      <path d="M32 42v10" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="54" r="3" fill="#e23d3d" stroke={ink} strokeWidth="2" />
    </Art>
  ),
  wave: (
    <Art>
      <path d="M6 28c6 0 6 8 12 8s6-8 12-8 6 8 12 8 6-8 12-8" fill="none" stroke="#2faf8a" strokeWidth="4" strokeLinecap="round" />
      <path d="M6 40c6 0 6 8 12 8s6-8 12-8 6 8 12 8 6-8 12-8" fill="none" stroke="#3e7d46" strokeWidth="4" strokeLinecap="round" />
    </Art>
  ),
  music: (
    <Art>
      <path d="M24 46V16l22-6v28" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <circle cx="18" cy="46" r="6" fill="#ee5a96" stroke={ink} strokeWidth="3" />
      <circle cx="40" cy="40" r="6" fill="#7cb342" stroke={ink} strokeWidth="3" />
    </Art>
  ),
  sparkle: (
    <Art>
      <path d="M32 8l4 14 14 4-14 4-4 14-4-14-14-4 14-4 4-14Z" fill="#f2c014" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="50" cy="16" r="3" fill="#ee5a96" />
      <circle cx="14" cy="46" r="3" fill="#2faf8a" />
    </Art>
  ),
  bat: (
    <Art>
      <path d="M8 30c8 2 12 10 16 10 2-8 6-12 8-12s6 4 8 12c4 0 8-8 16-10-6 10-8 18-14 18-4-6-8-6-10-2-2-4-6-4-10 2-6 0-8-8-14-18Z" fill="#4a3b55" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="28" cy="32" r="1.6" fill="#fff" />
      <circle cx="36" cy="32" r="1.6" fill="#fff" />
    </Art>
  ),
  bell: (
    <Art>
      <path d="M32 10a14 14 0 0 0-14 16v8l-4 6h36l-4-6v-8A14 14 0 0 0 32 10Z" fill="#f2c014" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="32" cy="48" r="4" fill="#e23d3d" stroke={ink} strokeWidth="2.5" />
      <path d="M32 6v4" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </Art>
  ),
  horse: (
    <Art>
      <path d="M14 40c2-14 10-22 20-22 2 0 6 2 8 0 4 6 10 8 10 16 0 4-4 6-4 10H22" fill="#c9854a" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="38" cy="24" r="1.8" fill={ink} />
      <path d="M18 40v10M28 42v8M40 42v8" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </Art>
  ),
  heart: (
    <Art>
      <path d="M32 52C12 40 8 26 16 18c6-6 12-2 16 4 4-6 10-10 16-4 8 8 4 22-16 34Z" fill="#ee5a96" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
    </Art>
  ),
  note: (
    <Art>
      <path d="M28 48V16l18-4v26" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <circle cx="22" cy="48" r="6" fill="#7cb342" stroke={ink} strokeWidth="3" />
    </Art>
  ),
}

export function Illustration({ name }: { name: IconName }) {
  return arts[name] ?? arts.note
}
