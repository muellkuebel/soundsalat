import { getSounds } from './audio/library.ts'
import { uid } from './lib/time.ts'
import type { Clip, Project, ThemeId } from './types.ts'

function clip(soundId: string, lane: number, startTime: number, volume = 0.85): Clip {
  const sound = getSounds().find((item) => item.id === soundId)
  if (!sound) throw new Error(`Unbekannter Beispielton ${soundId}`)
  return {
    id: uid(),
    soundId,
    lane,
    startTime,
    trimStart: 0,
    trimEnd: sound.duration,
    volume,
    locked: false,
  }
}

function project(
  title: string,
  theme: ThemeId,
  createdAt: number,
  clips: Clip[],
): Project {
  return {
    id: uid(),
    title,
    theme,
    createdAt,
    updatedAt: createdAt,
    clips,
  }
}

export function makeSeedProjects(now = Date.now()): Project[] {
  return [
    project('Für Leo', 'fire', now - 1000, [
      clip('fire-knistern', 0, 0.2),
      clip('circus-pauke', 1, 0.4),
      clip('football-pfeife', 2, 2.2),
      clip('space-laser', 3, 3.4, 0.7),
      clip('princess-funkeln', 2, 4.8),
      clip('castle-fanfare', 1, 6.2),
    ]),
    project('Weltmeister', 'football', now - 2000, [
      clip('football-pfeife', 0, 0.2),
      clip('football-fanfare', 1, 0.4),
      clip('football-schuss', 2, 1.8),
      clip('football-jubel', 3, 2.3),
      clip('football-tor', 1, 3.8),
    ]),
    project('Affenbande', 'circus', now - 3000, [
      clip('circus-pauke', 0, 0),
      clip('circus-melodie', 1, 0.6),
      clip('circus-hupe', 2, 2.2),
      clip('circus-applaus', 3, 3.2),
      clip('circus-tusch', 1, 5.0),
    ]),
    project('Schlaflied', 'space', now - 4000, [
      clip('princess-weise', 0, 0.2, 0.7),
      clip('princess-funkeln', 1, 0.8, 0.6),
      clip('princess-krone', 2, 1.6, 0.65),
      clip('space-piep', 3, 3.4, 0.55),
      clip('princess-stern', 1, 5.2, 0.6),
    ]),
    project('Mias Projekt', 'pirates', now - 5000, [
      clip('pirates-wellen', 0, 0, 0.7),
      clip('pirates-weise', 1, 0.8),
      clip('pirates-moewe', 2, 1.6, 0.6),
      clip('pirates-kanone', 3, 4.2, 0.75),
      clip('pirates-knarren', 2, 5.6),
    ]),
  ]
}
