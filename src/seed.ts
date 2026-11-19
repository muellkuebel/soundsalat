import type { Project } from './types.ts'

const DEMO_CLIPS: Record<string, Array<[string, number, number, number]>> = {
  'Für Leo': [
    ['fire-knistern', 0, 0.2, 0.85],
    ['circus-pauke', 1, 0.4, 0.85],
    ['football-pfeife', 2, 2.2, 0.85],
    ['space-laser', 3, 3.4, 0.7],
    ['princess-funkeln', 2, 4.8, 0.85],
    ['castle-fanfare', 1, 6.2, 0.85],
  ],
  Weltmeister: [
    ['football-pfeife', 0, 0.2, 0.85],
    ['football-fanfare', 1, 0.4, 0.85],
    ['football-schuss', 2, 1.8, 0.85],
    ['football-jubel', 3, 2.3, 0.85],
    ['football-tor', 1, 3.8, 0.85],
  ],
  Affenbande: [
    ['circus-pauke', 0, 0, 0.85],
    ['circus-melodie', 1, 0.6, 0.85],
    ['circus-hupe', 2, 2.2, 0.85],
    ['circus-applaus', 3, 3.2, 0.85],
    ['circus-tusch', 1, 5, 0.85],
  ],
  Schlaflied: [
    ['princess-weise', 0, 0.2, 0.7],
    ['princess-funkeln', 1, 0.8, 0.6],
    ['princess-krone', 2, 1.6, 0.65],
    ['space-piep', 3, 3.4, 0.55],
    ['princess-stern', 1, 5.2, 0.6],
  ],
  'Mias Projekt': [
    ['pirates-wellen', 0, 0, 0.7],
    ['pirates-weise', 1, 0.8, 0.85],
    ['pirates-moewe', 2, 1.6, 0.6],
    ['pirates-kanone', 3, 4.2, 0.75],
    ['pirates-knarren', 2, 5.6, 0.85],
  ],
}

export function isUntouchedDemo(project: Project): boolean {
  if (project.updatedAt !== project.createdAt) return false
  const template = DEMO_CLIPS[project.title]
  if (!template || project.clips.length !== template.length) return false
  return project.clips.every((clip, index) => {
    const row = template[index]
    if (!row) return false
    const [soundId, lane, startTime, volume] = row
    return (
      clip.soundId === soundId &&
      clip.lane === lane &&
      clip.startTime === startTime &&
      clip.volume === volume &&
      !clip.locked
    )
  })
}
