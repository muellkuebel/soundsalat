import { BUILTIN_SOUNDS, type SoundItem } from './catalog.ts'
import { getEngine } from './engine.ts'
import { renderSound } from './recipes.ts'
import { isCategoryId, isIconName } from '../categories.ts'

const bufferPromises = new Map<string, Promise<AudioBuffer>>()
const recordingBlobs = new Map<string, Blob>()
let sounds: SoundItem[] = [...BUILTIN_SOUNDS]

export function getSounds(): SoundItem[] {
  return sounds
}

export function soundById(id: string): SoundItem | undefined {
  return sounds.find((sound) => sound.id === id)
}

type ManifestClip = {
  id?: string
  name?: string
  category?: string
  icon?: string
  file?: string
  duration?: number
}

export async function loadExtraSounds(): Promise<SoundItem[]> {
  try {
    const response = await fetch('/sounds/manifest.json')
    if (!response.ok) return []
    const data = (await response.json()) as { clips?: ManifestClip[] }
    const extras: SoundItem[] = []
    for (const clip of data.clips ?? []) {
      if (!clip?.id || !clip.file || !clip.category || !isCategoryId(clip.category)) continue
      extras.push({
        id: clip.id,
        name: clip.name?.trim() || clip.id,
        category: clip.category,
        icon: clip.icon && isIconName(clip.icon) ? clip.icon : 'music',
        duration: typeof clip.duration === 'number' && clip.duration > 0 ? clip.duration : 1,
        file: `/sounds/${clip.file.replace(/^\/+/, '')}`,
        recipe: fallbackRecipe(clip.category),
      })
    }
    sounds = extras.length > 0 ? extras : [...BUILTIN_SOUNDS]
    return extras
  } catch {
    sounds = [...BUILTIN_SOUNDS]
    return []
  }
}

function fallbackRecipe(category: string) {
  return BUILTIN_SOUNDS.find((item) => item.category === category && item.recipe)?.recipe
}

function builtinById(id: string) {
  return BUILTIN_SOUNDS.find((item) => item.id === id)
}

export function registerRecording(id: string, blob: Blob, buffer?: AudioBuffer) {
  const soundId = `rec:${id}`
  recordingBlobs.set(soundId, blob)
  if (buffer) bufferPromises.set(soundId, Promise.resolve(buffer))
}

export function forgetRecording(id: string) {
  const soundId = `rec:${id}`
  recordingBlobs.delete(soundId)
  bufferPromises.delete(soundId)
}

export function getBuffer(id: string): Promise<AudioBuffer> {
  const existing = bufferPromises.get(id)
  if (existing) return existing
  const sound = soundById(id) ?? builtinById(id)
  let promise: Promise<AudioBuffer>
  if (id.startsWith('rec:')) {
    const blob = recordingBlobs.get(id)
    if (!blob) return Promise.reject(new Error('Aufnahme fehlt'))
    promise = decodeBlob(blob)
  } else if (sound?.file) {
    promise = decodeUrl(sound.file).catch(() => {
      if (!sound.recipe) throw new Error('Datei fehlt')
      return renderSound(`${sound.id}-fallback`, Math.max(sound.duration, 0.4), sound.recipe)
    })
  } else if (sound?.recipe) {
    promise = renderSound(sound.id, sound.duration, sound.recipe)
  } else {
    return Promise.reject(new Error('Ton fehlt'))
  }
  bufferPromises.set(id, promise)
  promise.catch(() => bufferPromises.delete(id))
  return promise
}

async function decodeBlob(blob: Blob): Promise<AudioBuffer> {
  const copy = (await blob.arrayBuffer()).slice(0)
  return getEngine().ctx.decodeAudioData(copy)
}

async function decodeUrl(url: string): Promise<AudioBuffer> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Datei fehlt')
  const copy = (await response.arrayBuffer()).slice(0)
  return getEngine().ctx.decodeAudioData(copy)
}

export function preloadSounds(items: SoundItem[]) {
  const queue = items.filter((item) => item.recipe || item.file)
  let active = 0
  const pump = () => {
    while (active < 3 && queue.length > 0) {
      const next = queue.shift()
      if (!next) return
      active += 1
      getBuffer(next.id)
        .catch(() => undefined)
        .finally(() => {
          active -= 1
          pump()
        })
    }
  }
  pump()
}
