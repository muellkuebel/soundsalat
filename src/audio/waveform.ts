export type Peak = { min: number; max: number }

export function computePeaks(buffer: AudioBuffer, bars: number): Peak[] {
  const data = buffer.getChannelData(0)
  const count = Math.max(1, bars)
  const size = Math.max(1, Math.floor(data.length / count))
  const peaks: Peak[] = []
  for (let i = 0; i < count; i++) {
    const start = i * size
    const end = Math.min(data.length, start + size)
    let min = 1
    let max = -1
    const step = Math.max(1, Math.floor((end - start) / 64))
    for (let j = start; j < end; j += step) {
      const value = data[j] ?? 0
      if (value < min) min = value
      if (value > max) max = value
    }
    if (max < min) {
      min = 0
      max = 0
    }
    peaks.push({ min, max })
  }
  return peaks
}
