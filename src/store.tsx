import { useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { createContext, useContext } from 'react'
import { getSounds, loadExtraSounds, preloadSounds, registerRecording, forgetRecording } from './audio/library.ts'
import { clearDatabase, loadDatabase, markSeeded, removeProject, saveProject, saveProjects, saveRecording } from './db.ts'
import { makeSeedProjects } from './seed.ts'
import type { Clip, Project, RecordingRecord, ThemeId } from './types.ts'
import { uid } from './lib/time.ts'

type State = {
  ready: boolean
  memoryOnly: boolean
  projects: Project[]
  recordings: RecordingRecord[]
  editorId: string | null
  parentUnlocked: boolean
  toast: string | null
}

type Action =
  | { type: 'loaded'; projects: Project[]; recordings: RecordingRecord[]; memoryOnly?: boolean }
  | { type: 'open'; id: string }
  | { type: 'home' }
  | { type: 'upsert'; project: Project }
  | { type: 'delete-project'; id: string }
  | { type: 'delete-all' }
  | { type: 'add-recording'; recording: RecordingRecord }
  | { type: 'toast'; message: string | null }
  | { type: 'unlock' }

const initial: State = {
  ready: false,
  memoryOnly: false,
  projects: [],
  recordings: [],
  editorId: null,
  parentUnlocked: false,
  toast: null,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loaded':
      return {
        ...state,
        ready: true,
        memoryOnly: Boolean(action.memoryOnly),
        projects: action.projects,
        recordings: action.recordings,
      }
    case 'open':
      return { ...state, editorId: action.id }
    case 'home':
      return { ...state, editorId: null }
    case 'upsert':
      return {
        ...state,
        projects: state.projects.some((project) => project.id === action.project.id)
          ? state.projects.map((project) => (project.id === action.project.id ? action.project : project))
          : [action.project, ...state.projects],
      }
    case 'delete-project':
      return {
        ...state,
        projects: state.projects.filter((project) => project.id !== action.id),
        recordings: state.recordings.filter((recording) => recording.projectId !== action.id),
        editorId: state.editorId === action.id ? null : state.editorId,
      }
    case 'delete-all':
      return { ...state, projects: [], recordings: [], editorId: null }
    case 'add-recording':
      return { ...state, recordings: [action.recording, ...state.recordings] }
    case 'toast':
      return { ...state, toast: action.message }
    case 'unlock':
      return { ...state, parentUnlocked: true }
    default:
      return state
  }
}

type StoreValue = State & {
  sounds: ReturnType<typeof getSounds>
  openProject: (id: string) => void
  goHome: () => void
  createProject: (title: string, theme: ThemeId) => string
  renameProject: (id: string, title: string) => void
  deleteProject: (id: string) => void
  deleteAll: () => void
  addClip: (projectId: string, clip: Clip) => void
  updateClip: (projectId: string, clipId: string, patch: Partial<Clip>) => void
  removeClip: (projectId: string, clipId: string) => void
  addRecording: (recording: RecordingRecord, buffer?: AudioBuffer) => void
  showToast: (message: string) => void
  unlockParent: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

let bootPromise: Promise<{ projects: Project[]; recordings: RecordingRecord[]; memoryOnly: boolean }> | null = null

function bootApp() {
  if (!bootPromise) {
    bootPromise = (async () => {
      try {
        await loadExtraSounds()
        const data = await loadDatabase()
        let projects = data.projects
        if (!data.seeded && projects.length === 0) {
          projects = makeSeedProjects()
          await saveProjects(projects)
          await markSeeded()
        }
        for (const recording of data.recordings) registerRecording(recording.id, recording.blob)
        preloadSounds(getSounds())
        return { projects, recordings: data.recordings, memoryOnly: false }
      } catch (error) {
        console.error(error)
        try {
          await loadExtraSounds()
        } catch {
          /* built-in sounds still work */
        }
        preloadSounds(getSounds())
        let projects: Project[] = []
        try {
          projects = makeSeedProjects()
        } catch {
          projects = []
        }
        return { projects, recordings: [] as RecordingRecord[], memoryOnly: true }
      }
    })()
  }
  return bootPromise
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial)
  const stateRef = useRef(state)
  stateRef.current = state
  const projectsRef = useRef(state.projects)
  projectsRef.current = state.projects
  const memoryOnly = useRef(false)
  const toastTimer = useRef(0)
  const saveTimers = useRef(new Map<string, number>())

  const showToast = (message: string) => {
    dispatch({ type: 'toast', message })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => dispatch({ type: 'toast', message: null }), 2600)
  }

  const persist = (project: Project) => {
    if (memoryOnly.current) return
    const timers = saveTimers.current
    const previous = timers.get(project.id)
    if (previous) window.clearTimeout(previous)
    timers.set(
      project.id,
      window.setTimeout(() => {
        timers.delete(project.id)
        void saveProject(project).catch(() => showToast('Speichern hat nicht geklappt.'))
      }, 180),
    )
  }

  const writeProject = (project: Project) => {
    const current = projectsRef.current
    projectsRef.current = current.some((item) => item.id === project.id)
      ? current.map((item) => (item.id === project.id ? project : item))
      : [project, ...current]
    dispatch({ type: 'upsert', project })
    persist(project)
  }

  useEffect(() => {
    let cancel = false
    void bootApp().then((data) => {
      if (cancel) return
      if (data.memoryOnly) memoryOnly.current = true
      dispatch({
        type: 'loaded',
        projects: data.projects,
        recordings: data.recordings,
        memoryOnly: data.memoryOnly,
      })
      if (data.memoryOnly) {
        dispatch({ type: 'toast', message: 'Speichern klappt hier nur für diese Sitzung.' })
      }
    })
    return () => {
      cancel = true
    }
  }, [])

  useEffect(() => {
    const flush = () => {
      if (memoryOnly.current) return
      for (const project of stateRef.current.projects) void saveProject(project).catch(() => {})
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [])

  const value = useMemo<StoreValue>(() => {
    const find = (projectId: string) => projectsRef.current.find((project) => project.id === projectId)
    return {
      ...state,
      sounds: getSounds(),
      openProject: (id) => dispatch({ type: 'open', id }),
      goHome: () => dispatch({ type: 'home' }),
      createProject: (title, theme) => {
        const now = Date.now()
        const project: Project = {
          id: uid(),
          title: title.trim().slice(0, 24) || 'Mein Salat',
          theme,
          createdAt: now,
          updatedAt: now,
          clips: [],
        }
        writeProject(project)
        dispatch({ type: 'open', id: project.id })
        return project.id
      },
      renameProject: (id, title) => {
        const project = find(id)
        if (!project) return
        writeProject({ ...project, title: title.trim().slice(0, 24) || project.title, updatedAt: Date.now() })
      },
      deleteProject: (id) => {
        const recordings = stateRef.current.recordings.filter((recording) => recording.projectId === id)
        for (const recording of recordings) forgetRecording(recording.id)
        projectsRef.current = projectsRef.current.filter((project) => project.id !== id)
        dispatch({ type: 'delete-project', id })
        if (!memoryOnly.current) void removeProject(id).catch(() => showToast('Löschen hat nicht geklappt.'))
      },
      deleteAll: () => {
        for (const recording of stateRef.current.recordings) forgetRecording(recording.id)
        projectsRef.current = []
        dispatch({ type: 'delete-all' })
        if (!memoryOnly.current) void clearDatabase().catch(() => showToast('Löschen hat nicht geklappt.'))
      },
      addClip: (projectId, clip) => {
        const project = find(projectId)
        if (!project) return
        writeProject({ ...project, clips: [...project.clips, clip], updatedAt: Date.now() })
      },
      updateClip: (projectId, clipId, patch) => {
        const project = find(projectId)
        if (!project) return
        writeProject({
          ...project,
          updatedAt: Date.now(),
          clips: project.clips.map((clip) => (clip.id === clipId ? { ...clip, ...patch } : clip)),
        })
      },
      removeClip: (projectId, clipId) => {
        const project = find(projectId)
        if (!project) return
        writeProject({
          ...project,
          updatedAt: Date.now(),
          clips: project.clips.filter((clip) => clip.id !== clipId),
        })
      },
      addRecording: (recording, buffer) => {
        registerRecording(recording.id, recording.blob, buffer)
        dispatch({ type: 'add-recording', recording })
        if (!memoryOnly.current) {
          void saveRecording(recording).catch(() => showToast('Aufnahme konnte nicht gespeichert werden.'))
        }
      },
      showToast,
      unlockParent: () => dispatch({ type: 'unlock' }),
    }
    // state fields are the render inputs; refs read the latest projects inside callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error('Store fehlt')
  return value
}
