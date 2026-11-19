export type OscWave = 'sine' | 'square' | 'sawtooth' | 'triangle'
export type Rng = () => number

export type Recipe =
  | {
      type: 'tone'
      freq: number
      dur: number
      start?: number
      wave?: OscWave
      gain?: number
      attack?: number
      release?: number
      filter?: number
      vibrato?: number
      vibratoDepth?: number
    }
  | {
      type: 'sweep'
      from: number
      to: number
      dur: number
      start?: number
      wave?: OscWave
      gain?: number
      curve?: 'exp' | 'lin'
      filter?: number
    }
  | {
      type: 'noise'
      dur: number
      start?: number
      gain?: number
      filter?: number
      filterType?: BiquadFilterType
      q?: number
      color?: 'white' | 'brown'
      attack?: number
      release?: number
    }
  | {
      type: 'melody'
      notes: number[]
      bpm: number
      wave?: OscWave
      gain?: number
      note?: number
      filter?: number
    }
  | {
      type: 'crackle'
      dur: number
      start?: number
      gap?: number
      gain?: number
    }
  | { type: 'mix'; parts: Recipe[] }

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function envelope(gain: GainNode, start: number, dur: number, peak: number, attack: number, release: number) {
  const a = Math.max(0.001, Math.min(attack, dur * 0.45))
  const r = Math.max(0.001, Math.min(release, dur * 0.45))
  const peakAt = start + a
  const releaseAt = Math.max(peakAt + 0.001, start + dur - r)
  const end = start + dur
  const level = Math.max(0.0001, peak)
  const param = gain.gain
  param.setValueAtTime(0.0001, start)
  param.linearRampToValueAtTime(level, peakAt)
  param.linearRampToValueAtTime(level, releaseAt)
  param.linearRampToValueAtTime(0.0001, end)
}

function schedule(ctx: BaseAudioContext, recipe: Recipe, dest: AudioNode, when: number, rng: Rng) {
  if (recipe.type === 'mix') {
    for (const part of recipe.parts) schedule(ctx, part, dest, when, rng)
    return
  }

  if (recipe.type === 'melody') {
    const beat = 60 / recipe.bpm
    const hold = beat * (recipe.note ?? 0.88)
    recipe.notes.forEach((freq, index) => {
      if (freq <= 0) return
      schedule(
        ctx,
        {
          type: 'tone',
          freq,
          dur: hold,
          start: index * beat,
          wave: recipe.wave ?? 'triangle',
          gain: recipe.gain ?? 0.3,
          attack: 0.012,
          release: Math.min(0.16, hold * 0.45),
          filter: recipe.filter,
        },
        dest,
        when,
        rng,
      )
    })
    return
  }

  if (recipe.type === 'crackle') {
    const begin = when + (recipe.start ?? 0)
    const end = begin + recipe.dur
    const gap = recipe.gap ?? 0.09
    let cursor = begin
    let count = 0
    while (cursor < end && count < 70) {
      cursor += gap * (0.35 + rng())
      if (cursor >= end) break
      const burst = 0.015 + rng() * 0.04
      schedule(
        ctx,
        {
          type: 'noise',
          dur: burst,
          filter: 900 + rng() * 2800,
          filterType: 'bandpass',
          q: 1.5,
          gain: (recipe.gain ?? 0.4) * (0.35 + rng() * 0.7),
          attack: 0.001,
          release: burst * 0.65,
        },
        dest,
        cursor,
        rng,
      )
      count += 1
    }
    return
  }

  const start = when + (recipe.start ?? 0)
  const dur = recipe.dur
  if (dur <= 0.012) return

  if (recipe.type === 'tone' || recipe.type === 'sweep') {
    const osc = ctx.createOscillator()
    osc.type = recipe.wave ?? (recipe.type === 'sweep' ? 'sawtooth' : 'sine')
    if (recipe.type === 'tone') {
      osc.frequency.setValueAtTime(Math.max(1, recipe.freq), start)
      if (recipe.vibrato && recipe.vibrato > 0) {
        const lfo = ctx.createOscillator()
        lfo.frequency.value = recipe.vibrato
        const depth = ctx.createGain()
        depth.gain.value = recipe.vibratoDepth ?? recipe.freq * 0.015
        lfo.connect(depth)
        depth.connect(osc.frequency)
        lfo.start(start)
        lfo.stop(start + dur + 0.02)
      }
    } else {
      const from = Math.max(1, recipe.from)
      const to = Math.max(1, recipe.to)
      osc.frequency.setValueAtTime(from, start)
      if ((recipe.curve ?? 'exp') === 'exp') osc.frequency.exponentialRampToValueAtTime(to, start + dur)
      else osc.frequency.linearRampToValueAtTime(to, start + dur)
    }

    const gain = ctx.createGain()
    const attack = recipe.type === 'tone' ? (recipe.attack ?? 0.012) : 0.01
    const release = recipe.type === 'tone' ? (recipe.release ?? Math.min(0.12, dur * 0.4)) : dur * 0.28
    envelope(gain, start, dur, recipe.gain ?? 0.32, attack, release)

    let tail: AudioNode = osc
    if (recipe.filter) {
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(recipe.filter, start)
      osc.connect(filter)
      tail = filter
    }
    tail.connect(gain)
    gain.connect(dest)
    osc.start(start)
    osc.stop(start + dur + 0.05)
    return
  }

  const frames = Math.max(1, Math.floor(dur * ctx.sampleRate))
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let brown = 0
  for (let i = 0; i < frames; i++) {
    const white = rng() * 2 - 1
    if (recipe.color === 'brown') {
      brown = (brown + white * 0.02) * 0.98
      data[i] = brown
    } else {
      data[i] = white
    }
  }
  let peak = 0.0001
  for (let i = 0; i < frames; i++) peak = Math.max(peak, Math.abs(data[i] ?? 0))
  const scale = 0.9 / peak
  for (let i = 0; i < frames; i++) data[i] = (data[i] ?? 0) * scale

  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = recipe.filterType ?? 'lowpass'
  filter.frequency.setValueAtTime(recipe.filter ?? 1400, start)
  filter.Q.setValueAtTime(recipe.q ?? 0.7, start)
  const gain = ctx.createGain()
  envelope(gain, start, dur, recipe.gain ?? 0.35, recipe.attack ?? 0.02, recipe.release ?? 0.08)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(dest)
  source.start(start)
  source.stop(start + dur + 0.05)
}

export async function renderSound(id: string, duration: number, recipe: Recipe): Promise<AudioBuffer> {
  const sampleRate = 44100
  const length = Math.max(1, Math.ceil(duration * sampleRate))
  const ctx = new OfflineAudioContext(1, length, sampleRate)
  const master = ctx.createGain()
  master.gain.value = 0.92
  master.connect(ctx.destination)
  schedule(ctx, recipe, master, 0, mulberry32(hashString(id)))
  return ctx.startRendering()
}
