export const CATEGORY_IDS = [
  'mic',
  'halloween',
  'castle',
  'fire',
  'princess',
  'football',
  'circus',
  'pirates',
  'space',
  'skate',
] as const

export type CategoryId = (typeof CATEGORY_IDS)[number]
export type ThemeId = Exclude<CategoryId, 'mic'>

export const ICON_NAMES = [
  'mic',
  'pumpkin',
  'castle',
  'flame',
  'crown',
  'ball',
  'clown',
  'jolly',
  'rocket',
  'skate',
  'drum',
  'stars',
  'ghost',
  'pistol',
  'whistle',
  'planet',
  'bird',
  'sword',
  'wave',
  'music',
  'sparkle',
  'bat',
  'bell',
  'horse',
  'heart',
  'note',
] as const

export type IconName = (typeof ICON_NAMES)[number]

export type Clip = {
  id: string
  soundId: string
  lane: number
  startTime: number
  trimStart: number
  trimEnd: number
  volume: number
  locked: boolean
}

export type Project = {
  id: string
  title: string
  theme: ThemeId
  createdAt: number
  updatedAt: number
  clips: Clip[]
}

export type RecordingRecord = {
  id: string
  projectId: string
  name: string
  duration: number
  createdAt: number
  blob: Blob
}

export type Category = {
  id: CategoryId
  name: string
  color: string
  icon: IconName
}
