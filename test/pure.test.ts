import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildBackup, parseBackup } from '../src/backup.ts'
import { encodeWav } from '../src/audio/wav.ts'
import { clampTrim, formatClock, formatClip, projectDuration } from '../src/lib/time.ts'
import { isUntouchedDemo } from '../src/seed.ts'
import type { Clip, Project, RecordingRecord } from '../src/types.ts'

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

function demoClip(soundId: string, lane: number, startTime: number, volume = 0.85): Clip {
  return { id: 'c', soundId, lane, startTime, trimStart: 0, trimEnd: 1, volume, locked: false }
}

test('untouched demo projects match the original seed', () => {
  const demo: Project = {
    id: 'p',
    title: 'Für Leo',
    theme: 'fire',
    createdAt: 1000,
    updatedAt: 1000,
    clips: [
      demoClip('fire-knistern', 0, 0.2),
      demoClip('circus-pauke', 1, 0.4),
      demoClip('football-pfeife', 2, 2.2),
      demoClip('space-laser', 3, 3.4, 0.7),
      demoClip('princess-funkeln', 2, 4.8),
      demoClip('castle-fanfare', 1, 6.2),
    ],
  }
  assert.equal(isUntouchedDemo(demo), true)
  assert.equal(isUntouchedDemo({ ...demo, title: 'Mein Salat' }), false)
  assert.equal(isUntouchedDemo({ ...demo, updatedAt: demo.createdAt + 5 }), false)
  assert.equal(isUntouchedDemo({ ...demo, clips: [] }), false)
})

test('backup roundtrip keeps projects and recording bytes', async () => {
  const projects: Project[] = [
    { id: 'p', title: 'Hallo', theme: 'fire', createdAt: 1, updatedAt: 1, clips: [] },
  ]
  const recordings: RecordingRecord[] = [
    {
      id: 'r',
      projectId: 'p',
      name: 'Aufnahme 1',
      duration: 1,
      createdAt: 2,
      blob: new Blob([Uint8Array.from([1, 2, 3])], { type: 'audio/webm' }),
    },
  ]
  const parsed = await parseBackup(await buildBackup(projects, recordings))
  assert.equal(parsed.projects[0]?.title, 'Hallo')
  assert.deepEqual([...new Uint8Array(await parsed.recordings[0]!.blob.arrayBuffer())], [1, 2, 3])
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
