import assert from 'node:assert/strict'
import { test } from 'node:test'
import { encodeWav } from '../src/audio/wav.ts'
import { clampTrim, formatClock, formatClip, projectDuration } from '../src/lib/time.ts'

test('formatClock matches a minute display', () => {
  assert.equal(formatClock(88), '01:28')
  assert.equal(formatClip(23), '0:23')
  assert.equal(formatClock(0.4), '00:01')
})

test('project duration uses trimmed clip ends', () => {
  const duration = projectDuration([
    { startTime: 1, trimStart: 0.2, trimEnd: 1.2 },
    { startTime: 4, trimStart: 0, trimEnd: 2 },
  ])
  assert.equal(duration, 6)
})

test('clampTrim keeps a minimum slice inside the buffer', () => {
  const result = clampTrim(2, 2.01, 3)
  assert.ok(result.end - result.start >= 0.08)
  assert.ok(result.start >= 0)
  assert.ok(result.end <= 3)
})

test('wav header is 16-bit stereo-ready pcm', async () => {
  const blob = encodeWav([new Float32Array([0, 0.5, -1])], 44100)
  const bytes = new Uint8Array(await blob.arrayBuffer())
  assert.equal(String.fromCharCode(...bytes.slice(0, 4)), 'RIFF')
  assert.equal(String.fromCharCode(...bytes.slice(8, 12)), 'WAVE')
  assert.equal(bytes[22], 1)
  assert.equal(blob.type, 'audio/wav')
  assert.equal(bytes.length, 44 + 3 * 2)
})
