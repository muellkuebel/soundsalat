import { createMixBus, scheduleClip } from './bus.ts'
import { projectDuration } from '../lib/time.ts'
import type { Clip } from '../types.ts'
import { audioBufferToWav } from './wav.ts'

export async function renderProjectWav(clips: Clip[], buffers: Map<string, AudioBuffer>): Promise<Blob> {
  const seconds = Math.max(0.4, projectDuration(clips) + 0.2)
  const sampleRate = 44100
  const offline = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate)
  const master = createMixBus(offline)
  for (const clip of clips) {
    const buffer = buffers.get(clip.soundId)
    if (!buffer) continue
    scheduleClip(offline, master, buffer, clip, 0, 0)
  }
  const rendered = await offline.startRendering()
  return audioBufferToWav(rendered)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}
