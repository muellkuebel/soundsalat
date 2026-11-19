import { soundById } from './audio/library.ts'
import { categoryById } from './categories.ts'
import type { IconName } from './types.ts'

export function appearance(soundId: string): { color: string; icon: IconName; name: string } {
  if (soundId.startsWith('rec:')) return { color: '#e23d3d', icon: 'mic', name: 'Aufnahme' }
  const sound = soundById(soundId)
  if (!sound) return { color: '#7cb342', icon: 'note', name: 'Ton' }
  return { color: categoryById(sound.category).color, icon: sound.icon, name: sound.name }
}
