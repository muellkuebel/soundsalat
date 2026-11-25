import type { Category, CategoryId, IconName, ThemeId } from './types.ts'
import { CATEGORY_IDS, ICON_NAMES } from './types.ts'

export const CATEGORIES: readonly Category[] = [
  { id: 'christmas', name: 'Weihnachten', color: '#c8304f', icon: 'tree' },
  { id: 'mic', name: 'Mikrofon', color: '#e23d3d', icon: 'mic' },
  { id: 'halloween', name: 'Halloween', color: '#f08a24', icon: 'pumpkin' },
  { id: 'castle', name: 'Ritter', color: '#e6a80e', icon: 'castle' },
  { id: 'fire', name: 'Feuer', color: '#ef5a28', icon: 'flame' },
  { id: 'princess', name: 'Prinzessin', color: '#ee5a96', icon: 'crown' },
  { id: 'football', name: 'Fußball', color: '#8b5cf6', icon: 'ball' },
  { id: 'circus', name: 'Zirkus', color: '#2faf8a', icon: 'clown' },
  { id: 'pirates', name: 'Piraten', color: '#3e7d46', icon: 'jolly' },
  { id: 'space', name: 'Weltall', color: '#5b3d99', icon: 'planet' },
  { id: 'skate', name: 'Skaten', color: '#7cb342', icon: 'skate' },
  { id: 'ambience', name: 'Hintergrund', color: '#3d8fd1', icon: 'cloud' },
]

export function categoryById(id: string): Category {
  return CATEGORIES.find((category) => category.id === id) ?? CATEGORIES[0]
}

export function isCategoryId(value: string): value is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(value)
}

export function isThemeId(value: string): value is ThemeId {
  return isCategoryId(value) && value !== 'mic'
}

export function isIconName(value: string): value is IconName {
  return (ICON_NAMES as readonly string[]).includes(value)
}

export const THEMES: Category[] = CATEGORIES.filter((category) => category.id !== 'mic')
