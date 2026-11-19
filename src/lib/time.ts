export function wholeSeconds(seconds: number): number {
  if (seconds <= 0.05) return 0
  return Math.max(1, Math.round(seconds))
}

export function formatClock(seconds: number): string {
  const total = wholeSeconds(seconds)
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export function formatClip(seconds: number): string {
  const total = wholeSeconds(seconds)
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

export function clipLength(clip: { trimStart: number; trimEnd: number }): number {
  return Math.max(0, clip.trimEnd - clip.trimStart)
}

export function projectDuration(
  clips: { startTime: number; trimStart: number; trimEnd: number }[],
): number {
  let max = 0
  for (const clip of clips) max = Math.max(max, clip.startTime + clipLength(clip))
  return max
}

export function clampTrim(
  start: number,
  end: number,
  duration: number,
): { start: number; end: number } {
  const limit = Math.max(0.08, duration)
  let a = Math.min(Math.max(0, start), limit)
  let b = Math.min(Math.max(0, end), limit)
  if (b < a) {
    const swap = a
    a = b
    b = swap
  }
  if (b - a < 0.08) {
    if (a + 0.08 <= limit) b = a + 0.08
    else a = Math.max(0, b - 0.08)
  }
  return { start: a, end: b }
}

export function snapTime(seconds: number): number {
  return Math.max(0, Math.round(seconds * 10) / 10)
}

export function safeFileBase(title: string): string {
  const base = title
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'soundsalat'
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
