import { createMixBus, scheduleClip, type Scheduled } from './bus.ts'
import type { Clip } from '../types.ts'

type Active = Scheduled & { clipId: string }

export class PlaybackEngine {
  readonly ctx: AudioContext
  private readonly master: GainNode
  private transport: Active[] = []
  private previews: Active[] = []
  private previewToken = 0
  private raf = 0
  private originCtx = 0
  private originTime = 0
  private playing = false
  onTime: (time: number) => void = () => {}
  onEnded: () => void = () => {}

  constructor() {
    const webkit = (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    const Ctor = window.AudioContext || webkit
    if (!Ctor) throw new Error('Web Audio fehlt')
    this.ctx = new Ctor()
    this.master = createMixBus(this.ctx)
  }

  unlock() {
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    const buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate)
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    source.connect(this.ctx.destination)
    try {
      source.start()
    } catch {
      /* already running */
    }
  }

  currentTime() {
    if (!this.playing) return this.originTime
    return this.originTime + (this.ctx.currentTime - this.originCtx)
  }

  play(items: { clip: Clip; buffer: AudioBuffer }[], from: number, end: number) {
    this.stopPreview()
    this.stopTransport()
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    const now = this.ctx.currentTime + 0.03
    this.originCtx = now
    this.originTime = from
    this.playing = true
    for (const item of items) {
      const node = scheduleClip(this.ctx, this.master, item.buffer, item.clip, now, from)
      if (!node) continue
      this.transport.push({ clipId: item.clip.id, ...node })
    }
    const tick = () => {
      if (!this.playing) return
      const time = this.originTime + (this.ctx.currentTime - this.originCtx)
      if (time >= end) {
        this.playing = false
        this.stopTransport()
        this.originTime = end
        this.onTime(end)
        this.onEnded()
        return
      }
      this.onTime(time)
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  pause() {
    const time = this.currentTime()
    this.playing = false
    this.stopTransport()
    this.originTime = time
    return time
  }

  stop() {
    this.playing = false
    this.stopTransport()
    this.stopPreview()
    this.originTime = 0
    this.onTime(0)
  }

  setClipVolume(id: string, volume: number) {
    const node = this.transport.find((item) => item.clipId === id)
    if (!node) return
    const now = this.ctx.currentTime
    const peak = Math.max(0.0001, Math.min(1, volume))
    const param = node.gain.gain
    param.cancelScheduledValues(now)
    param.setValueAtTime(param.value, now)
    param.linearRampToValueAtTime(peak, now + 0.03)
    if (node.stopAt > now + 0.08) {
      param.setValueAtTime(peak, node.stopAt - 0.02)
      param.linearRampToValueAtTime(0.0001, node.stopAt)
    }
  }

  preview(buffer: AudioBuffer, offset: number, duration: number, volume: number, onEnded?: () => void) {
    this.stopPreview()
    const token = this.previewToken
    const clip: Clip = {
      id: 'preview',
      soundId: 'preview',
      lane: 0,
      startTime: 0,
      trimStart: Math.max(0, offset),
      trimEnd: Math.max(0, offset) + Math.max(0.02, duration),
      volume,
      locked: false,
    }
    const now = this.ctx.currentTime + 0.02
    const node = scheduleClip(this.ctx, this.master, buffer, clip, now, 0)
    if (!node) {
      onEnded?.()
      return
    }
    this.previews.push({ clipId: 'preview', ...node })
    node.source.onended = () => {
      if (token !== this.previewToken) return
      this.previews = this.previews.filter((item) => item.source !== node.source)
      onEnded?.()
    }
  }

  stopPreview() {
    this.previewToken += 1
    this.dispose(this.previews)
    this.previews = []
  }

  private stopTransport() {
    cancelAnimationFrame(this.raf)
    this.dispose(this.transport)
    this.transport = []
  }

  private dispose(nodes: Active[]) {
    for (const node of nodes) {
      try {
        node.source.onended = null
        node.source.stop()
      } catch {
        /* already stopped */
      }
      try {
        node.source.disconnect()
        node.gain.disconnect()
      } catch {
        /* already disconnected */
      }
    }
  }
}

let singleton: PlaybackEngine | null = null

export function getEngine(): PlaybackEngine {
  if (!singleton) singleton = new PlaybackEngine()
  return singleton
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    singleton?.ctx.close().catch(() => {})
    singleton = null
  })
}
