import type { Clip } from '../types.ts'

export function createMixBus(ctx: BaseAudioContext): GainNode {
  const master = ctx.createGain()
  master.gain.value = 0.9
  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -12
  compressor.knee.value = 18
  compressor.ratio.value = 3.5
  compressor.attack.value = 0.005
  compressor.release.value = 0.22
  master.connect(compressor)
  compressor.connect(ctx.destination)
  return master
}

export type Scheduled = {
  source: AudioBufferSourceNode
  gain: GainNode
  stopAt: number
}

export function scheduleClip(
  ctx: BaseAudioContext,
  dest: AudioNode,
  buffer: AudioBuffer,
  clip: Clip,
  when: number,
  from: number,
): Scheduled | null {
  const audible = Math.max(0, clip.trimEnd - clip.trimStart)
  const clipEnd = clip.startTime + audible
  if (clipEnd <= from + 0.001) return null
  const delay = Math.max(0, clip.startTime - from)
  const offset = clip.trimStart + Math.max(0, from - clip.startTime)
  const available = Math.max(0, buffer.duration - offset)
  const playDur = Math.min(audible - Math.max(0, from - clip.startTime), available)
  if (playDur < 0.02) return null

  const source = ctx.createBufferSource()
  source.buffer = buffer
  const gain = ctx.createGain()
  const startAt = when + delay
  const stopAt = startAt + playDur
  const fade = Math.min(0.012, playDur / 3)
  const peak = Math.max(0.0001, Math.min(1, clip.volume))
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.linearRampToValueAtTime(peak, startAt + fade)
  const releaseAt = Math.max(startAt + fade + 0.001, stopAt - fade)
  gain.gain.setValueAtTime(peak, releaseAt)
  gain.gain.linearRampToValueAtTime(0.0001, stopAt)
  source.connect(gain)
  gain.connect(dest)
  source.start(startAt, Math.max(0, offset), playDur)
  return { source, gain, stopAt }
}
