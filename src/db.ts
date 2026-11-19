import type { Project, RecordingRecord } from './types.ts'

const DB_NAME = 'soundsalat'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('recordings')) db.createObjectStore('recordings', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function loadDatabase(): Promise<{ projects: Project[]; recordings: RecordingRecord[]; seeded: boolean }> {
  const db = await openDb()
  const projectTx = db.transaction('projects', 'readonly')
  const projects = await requestToPromise(projectTx.objectStore('projects').getAll() as IDBRequest<Project[]>)
  const recordingTx = db.transaction('recordings', 'readonly')
  const recordings = await requestToPromise(
    recordingTx.objectStore('recordings').getAll() as IDBRequest<RecordingRecord[]>,
  )
  const metaTx = db.transaction('meta', 'readonly')
  const seeded = Boolean(await requestToPromise(metaTx.objectStore('meta').get('seeded')))
  return { projects: projects ?? [], recordings: recordings ?? [], seeded }
}

export async function saveProject(project: Project): Promise<void> {
  const db = await openDb()
  const tx = db.transaction('projects', 'readwrite')
  tx.objectStore('projects').put(project)
  await transactionDone(tx)
}

export async function saveProjects(projects: Project[]): Promise<void> {
  const db = await openDb()
  const tx = db.transaction('projects', 'readwrite')
  for (const project of projects) tx.objectStore('projects').put(project)
  await transactionDone(tx)
}

export async function removeProject(id: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(['projects', 'recordings'], 'readwrite')
  tx.objectStore('projects').delete(id)
  const index = tx.objectStore('recordings')
  const all = await requestToPromise(index.getAll() as IDBRequest<RecordingRecord[]>)
  for (const recording of all ?? []) {
    if (recording.projectId === id) index.delete(recording.id)
  }
  await transactionDone(tx)
}

export async function saveRecording(recording: RecordingRecord): Promise<void> {
  const db = await openDb()
  const tx = db.transaction('recordings', 'readwrite')
  tx.objectStore('recordings').put(recording)
  await transactionDone(tx)
}

export async function markSeeded(): Promise<void> {
  const db = await openDb()
  const tx = db.transaction('meta', 'readwrite')
  tx.objectStore('meta').put(true, 'seeded')
  await transactionDone(tx)
}

export async function clearDatabase(): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(['projects', 'recordings'], 'readwrite')
  tx.objectStore('projects').clear()
  tx.objectStore('recordings').clear()
  await transactionDone(tx)
}
