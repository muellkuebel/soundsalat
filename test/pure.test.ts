import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { BUILTIN_SOUNDS } from '../src/audio/catalog.ts'
import { CATEGORIES, isCategoryId, isIconName } from '../src/categories.ts'
import { chipState } from '../src/lib/tray.ts'
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

test('the + stays on the last tapped tile after playback ends', () => {
  assert.deepEqual(chipState('a', 'a', 'a'), { playing: true, showAdd: true })
  assert.deepEqual(chipState('a', null, 'a'), { playing: false, showAdd: true })
  assert.deepEqual(chipState('a', null, 'b'), { playing: false, showAdd: false })
  assert.deepEqual(chipState('b', 'b', 'b'), { playing: true, showAdd: true })
})

type ManifestClip = { id: string; name: string; category: string; icon: string; file: string; duration: number }
const publicDir = new URL('../public/', import.meta.url)
const manifestClips = (JSON.parse(readFileSync(new URL('sounds/manifest.json', publicDir), 'utf8')) as { clips: ManifestClip[] }).clips

test('every sound in the manifest has a file, an icon, and a known category', () => {
  const ids = new Set<string>()
  for (const clip of manifestClips) {
    assert.ok(isCategoryId(clip.category) && clip.category !== 'mic', `${clip.id} category`)
    assert.ok(isIconName(clip.icon), `${clip.id} icon name`)
    assert.ok(existsSync(new URL(`sounds/${clip.file}`, publicDir)), `${clip.id} file`)
    assert.ok(existsSync(new URL(`emoji/${clip.id}.svg`, publicDir)), `${clip.id} emoji`)
    assert.ok(clip.duration > 0)
    assert.ok(!ids.has(clip.id), `${clip.id} unique`)
    ids.add(clip.id)
  }
})

test('every category has a tab picture, a cached tab, sounds, and a fallback', () => {
  const sw = readFileSync(new URL('sw.js', publicDir), 'utf8')
  for (const category of CATEGORIES) {
    assert.ok(existsSync(new URL(`tabs/${category.id}.svg`, publicDir)), `${category.id} tab`)
    assert.ok(sw.includes(`tabs/${category.id}.svg`), `${category.id} precached`)
    if (category.id === 'mic') continue
    assert.ok(manifestClips.filter((clip) => clip.category === category.id).length >= 8, `${category.id} sounds`)
    assert.ok(BUILTIN_SOUNDS.some((sound) => sound.category === category.id && sound.recipe), `${category.id} fallback`)
  }
  assert.equal(new Set(CATEGORIES.map((category) => category.color)).size, CATEGORIES.length)
})

test('Weihnachten is the second tab and has every story sound with its own picture', () => {
  assert.equal(CATEGORIES[0]?.id, 'mic')
  assert.equal(CATEGORIES[1]?.id, 'christmas')
  const christmas = manifestClips.filter((clip) => clip.category === 'christmas')
  assert.ok(christmas.length >= 90)
  const names = christmas.map((clip) => clip.name)
  for (const name of ['Niesen', 'Schnarchen', 'Weihnachtsmusik', 'Karussellmusik', 'Hämmern', 'Eule', 'Telefon klingelt', 'Wind', 'Plumps']) {
    assert.ok(names.includes(name), name)
  }
  assert.equal(new Set(names).size, names.length, 'labels are unique')
  const pictures = christmas.map((clip) => readFileSync(new URL(`emoji/${clip.id}.svg`, publicDir), 'utf8'))
  assert.equal(new Set(pictures).size, pictures.length, 'every Weihnachten tile has its own picture')
})

test('christmas has sleigh bells and snow steps, ambience clips are long', () => {
  const christmas = manifestClips.filter((clip) => clip.category === 'christmas').map((clip) => clip.id)
  assert.ok(christmas.includes('christmas-schlitten'))
  assert.ok(christmas.includes('christmas-stapfen'))
  assert.ok(christmas.includes('christmas-jinglebells'))
  const ambience = manifestClips.filter((clip) => clip.category === 'ambience')
  assert.ok(ambience.length >= 8)
  for (const clip of ambience) assert.ok(clip.duration >= 8, `${clip.id} long enough`)
})
