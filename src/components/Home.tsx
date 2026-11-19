import { useState } from 'react'
import { categoryById } from '../categories.ts'
import { formatClock, projectDuration } from '../lib/time.ts'
import { useStore } from '../store.tsx'
import type { Project, ThemeId } from '../types.ts'
import {
  ConfirmDialog,
  GateDialog,
  HelpDialog,
  MenuDialog,
  NewProjectDialog,
  ParentDialog,
  RenameDialog,
} from './Dialogs.tsx'
import { Illustration } from './illustrations.tsx'
import { Logo } from './Logo.tsx'

type Dialog =
  | null
  | { type: 'help' }
  | { type: 'new' }
  | { type: 'menu'; id: string }
  | { type: 'rename'; id: string }
  | { type: 'gate'; then: 'parent' | { deleteId: string } }
  | { type: 'parent' }
  | { type: 'confirm-delete'; id: string }
  | { type: 'confirm-all' }

export function Home() {
  const store = useStore()
  const [dialog, setDialog] = useState<Dialog>(null)
  const projects = [...store.projects].sort((a, b) => b.createdAt - a.createdAt)

  function projectById(id: string) {
    return store.projects.find((project) => project.id === id)
  }

  function askParent(then: 'parent' | { deleteId: string }) {
    if (store.parentUnlocked) {
      if (then === 'parent') setDialog({ type: 'parent' })
      else setDialog({ type: 'confirm-delete', id: then.deleteId })
      return
    }
    setDialog({ type: 'gate', then })
  }

  return (
    <div className="home" data-screen="home">
      <header className="home-top">
        <button type="button" className="parent-btn" onClick={() => askParent('parent')}>
          Für Eltern
        </button>
        <Logo />
        <button type="button" className="help-btn" aria-label="Hilfe" onClick={() => setDialog({ type: 'help' })}>
          ?
        </button>
      </header>
      <div className="home-grid">
        <button type="button" className="card card-new" onClick={() => setDialog({ type: 'new' })}>
          <span className="plus-slice" aria-hidden="true">
            +
          </span>
          <span className="sr">Neues Abenteuer</span>
        </button>
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onOpen={() => store.openProject(project.id)}
            onMenu={() => setDialog({ type: 'menu', id: project.id })}
          />
        ))}
      </div>
      {dialog?.type === 'help' ? <HelpDialog onClose={() => setDialog(null)} /> : null}
      {dialog?.type === 'new' ? (
        <NewProjectDialog
          onClose={() => setDialog(null)}
          onCreate={(title, theme: ThemeId) => {
            setDialog(null)
            store.createProject(title, theme)
          }}
        />
      ) : null}
      {dialog?.type === 'menu' && projectById(dialog.id) ? (
        <MenuDialog
          project={projectById(dialog.id) as Project}
          onClose={() => setDialog(null)}
          onOpen={() => {
            const id = dialog.id
            setDialog(null)
            store.openProject(id)
          }}
          onRename={() => setDialog({ type: 'rename', id: dialog.id })}
          onDelete={() => askParent({ deleteId: dialog.id })}
        />
      ) : null}
      {dialog?.type === 'rename' && projectById(dialog.id) ? (
        <RenameDialog
          project={projectById(dialog.id) as Project}
          onClose={() => setDialog(null)}
          onSave={(title) => {
            store.renameProject(dialog.id, title)
            setDialog(null)
          }}
        />
      ) : null}
      {dialog?.type === 'gate' ? (
        <GateDialog
          onClose={() => setDialog(null)}
          onSuccess={() => {
            store.unlockParent()
            if (dialog.then === 'parent') setDialog({ type: 'parent' })
            else setDialog({ type: 'confirm-delete', id: dialog.then.deleteId })
          }}
        />
      ) : null}
      {dialog?.type === 'confirm-delete' ? (
        <ConfirmDialog
          title="Projekt löschen?"
          body="Die Aufnahmen in diesem Abenteuer werden mitgelöscht."
          confirmLabel="Ja, löschen"
          onClose={() => setDialog(null)}
          onConfirm={() => {
            store.deleteProject(dialog.id)
            setDialog(null)
          }}
        />
      ) : null}
      {dialog?.type === 'parent' ? (
        <ParentDialog
          projects={store.projects}
          onClose={() => setDialog(null)}
          onOpen={(id) => {
            setDialog(null)
            store.openProject(id)
          }}
          onRename={store.renameProject}
          onDelete={(id) => setDialog({ type: 'confirm-delete', id })}
          onDeleteAll={() => setDialog({ type: 'confirm-all' })}
        />
      ) : null}
      {dialog?.type === 'confirm-all' ? (
        <ConfirmDialog
          title="Alles löschen?"
          body="Alle Projekte und Aufnahmen auf diesem Gerät werden entfernt."
          confirmLabel="Ja, alles löschen"
          onClose={() => setDialog({ type: 'parent' })}
          onConfirm={() => {
            store.deleteAll()
            setDialog(null)
          }}
        />
      ) : null}
    </div>
  )
}

function ProjectCard({ project, onOpen, onMenu }: { project: Project; onOpen: () => void; onMenu: () => void }) {
  const theme = categoryById(project.theme)
  return (
    <button
      type="button"
      className="card"
      data-project-title={project.title}
      onClick={onOpen}
      onContextMenu={(event) => {
        event.preventDefault()
        onMenu()
      }}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return
        const startX = event.clientX
        const startY = event.clientY
        let fired = false
        const timer = window.setTimeout(() => {
          fired = true
          onMenu()
        }, 560)
        const clear = () => {
          window.clearTimeout(timer)
          window.removeEventListener('pointerup', up)
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointercancel', clear)
        }
        const move = (ev: PointerEvent) => {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 12) clear()
        }
        const up = () => {
          if (fired) {
            /* menu already open; the click still fires. stop it. */
            const stop = (click: Event) => {
              click.preventDefault()
              click.stopPropagation()
              window.removeEventListener('click', stop, true)
            }
            window.addEventListener('click', stop, true)
          }
          clear()
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
        window.addEventListener('pointercancel', clear)
      }}
    >
      <div className="card-art" style={{ background: theme.color }}>
        <span className="art-blob">
          <Illustration name={theme.icon} />
        </span>
      </div>
      <div className="card-meta">
        <div className="card-title">{project.title}</div>
        <div className="card-dur">{formatClock(projectDuration(project.clips))}</div>
      </div>
    </button>
  )
}
