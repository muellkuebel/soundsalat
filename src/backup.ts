import type { Project, RecordingRecord } from './types.ts'

export type BackupRecording = {
  id: string
  projectId: string
  name: string
  duration: number
  createdAt: number
  mime: string
  file: string
}

export type BackupFile = {
  format: 'soundsalat-backup'
  version: 1
  exportedAt: string
  projects: Project[]
  recordings: BackupRecording[]
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(data: Uint8Array) {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ (data[i] ?? 0)) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function dosStamp(date: Date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = (date.getFullYear() - 1980) << 9 | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, day }
}

export function zipStore(files: { name: string; data: Uint8Array }[]): Blob {
  const now = dosStamp(new Date())
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const file of files) {
    const name = new TextEncoder().encode(file.name)
    const crc = crc32(file.data)
    const local = new Uint8Array(30 + name.length)
    const view = new DataView(local.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(8, 0, true)
    view.setUint16(10, now.time, true)
    view.setUint16(12, now.day, true)
    view.setUint32(14, crc, true)
    view.setUint32(18, file.data.length, true)
    view.setUint32(22, file.data.length, true)
    view.setUint16(26, name.length, true)
    local.set(name, 30)
    locals.push(local, file.data)
    const central = new Uint8Array(46 + name.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, now.time, true)
    centralView.setUint16(14, now.day, true)
    centralView.setUint32(16, crc, true)
    centralView.setUint32(20, file.data.length, true)
    centralView.setUint32(24, file.data.length, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint32(42, offset, true)
    central.set(name, 46)
    centrals.push(central)
    offset += local.length + file.data.length
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, files.length, true)
  endView.setUint16(10, files.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)
  const parts = [...locals, ...centrals, end].map(
    (part) => part.buffer.slice(part.byteOffset, part.byteOffset + part.byteLength) as ArrayBuffer,
  )
  return new Blob(parts, { type: 'application/zip' })
}

export async function readZip(blob: Blob): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const files = new Map<string, Uint8Array>()
  let offset = 0
  const view = new DataView(bytes.buffer)
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const method = view.getUint16(offset + 8, true)
    const size = view.getUint32(offset + 18, true)
    const nameLength = view.getUint16(offset + 26, true)
    const extraLength = view.getUint16(offset + 28, true)
    const start = offset + 30 + nameLength + extraLength
    const name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLength))
    if (method !== 0) throw new Error('Die Sicherung ist komprimiert und kann hier nicht gelesen werden.')
    files.set(name, bytes.slice(start, start + size))
    offset = start + size
  }
  if (!files.size) throw new Error('Das ist keine Soundsalat-Sicherung.')
  return files
}

export async function buildBackup(projects: Project[], recordings: RecordingRecord[]): Promise<Blob> {
  const listed: BackupRecording[] = recordings.map((recording) => ({
    id: recording.id,
    projectId: recording.projectId,
    name: recording.name,
    duration: recording.duration,
    createdAt: recording.createdAt,
    mime: recording.blob.type || 'application/octet-stream',
    file: `recordings/${recording.id}`,
  }))
  const payload: BackupFile = {
    format: 'soundsalat-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    projects,
    recordings: listed,
  }
  const files = [
    { name: 'soundsalat-backup.json', data: new TextEncoder().encode(JSON.stringify(payload)) },
  ]
  for (const recording of recordings) {
    files.push({
      name: `recordings/${recording.id}`,
      data: new Uint8Array(await recording.blob.arrayBuffer()),
    })
  }
  return zipStore(files)
}

export async function parseBackup(blob: Blob): Promise<{ projects: Project[]; recordings: RecordingRecord[] }> {
  const files = await readZip(blob)
  const raw = files.get('soundsalat-backup.json')
  if (!raw) throw new Error('Die Sicherung enthält keine Projekte.')
  const data = JSON.parse(new TextDecoder().decode(raw)) as BackupFile
  if (data.format !== 'soundsalat-backup' || !Array.isArray(data.projects)) {
    throw new Error('Diese Datei ist keine Soundsalat-Sicherung.')
  }
  const recordings: RecordingRecord[] = []
  for (const item of data.recordings ?? []) {
    const bytes = files.get(item.file)
    if (!bytes) continue
    const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    recordings.push({
      id: item.id,
      projectId: item.projectId,
      name: item.name,
      duration: item.duration,
      createdAt: item.createdAt,
      blob: new Blob([copy], { type: item.mime || 'application/octet-stream' }),
    })
  }
  return { projects: data.projects, recordings }
}
