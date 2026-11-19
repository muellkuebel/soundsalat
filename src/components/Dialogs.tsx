import { useEffect, useRef, useState, type ReactNode } from 'react'
import { THEMES } from '../categories.ts'
import { formatClock } from '../lib/time.ts'
import { projectDuration } from '../lib/time.ts'
import type { Project, ThemeId } from '../types.ts'
import { Illustration } from './illustrations.tsx'
import { canInstall, promptInstall, subscribeInstall } from '../install.ts'

function Sheet({
  title,
  children,
  onClose,
  wide,
}: {
  title: string
  children: ReactNode
  onClose?: () => void
  wide?: boolean
}) {
  return (
    <div className="backdrop" role="presentation" onPointerDown={onClose}>
      <div
        className={`sheet ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-label={title}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Hilfe" onClose={onClose}>
      <h2>So geht Soundsalat</h2>
      <div className="help-steps">
        <div>
          <span className="help-bubble">+</span>
          <p>Neues Abenteuer</p>
        </div>
        <div>
          <Illustration name="music" />
          <p>Ton antippen, anhören, dann ziehen oder +</p>
        </div>
        <div>
          <Illustration name="mic" />
          <p>Stimme aufnehmen</p>
        </div>
      </div>
      <button type="button" className="primary" onClick={onClose}>
        Verstanden
      </button>
    </Sheet>
  )
}

export function NewProjectDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (title: string, theme: ThemeId) => void
}) {
  const [title, setTitle] = useState('Mein Salat')
  const [theme, setTheme] = useState<ThemeId>('skate')
  return (
    <Sheet title="Neues Abenteuer" onClose={onClose}>
      <h2>Wie heißt dein Salat?</h2>
      <input
        className="name-input"
        value={title}
        maxLength={24}
        autoFocus
        aria-label="Name"
        onChange={(event) => setTitle(event.target.value)}
      />
      <div className="theme-picker">
        {THEMES.map((item) => (
          <button
            type="button"
            key={item.id}
            className={item.id === theme ? 'active' : ''}
            style={{ background: item.color }}
            aria-label={item.name}
            aria-pressed={item.id === theme}
            onClick={() => setTheme(item.id as ThemeId)}
          >
            <Illustration name={item.icon} />
          </button>
        ))}
      </div>
      <div className="row-actions">
        <button type="button" className="ghost" onClick={onClose}>
          Abbrechen
        </button>
        <button type="button" className="primary" onClick={() => onCreate(title, theme)}>
          Los geht's!
        </button>
      </div>
    </Sheet>
  )
}

export function RenameDialog({
  project,
  onClose,
  onSave,
}: {
  project: Project
  onClose: () => void
  onSave: (title: string) => void
}) {
  const [title, setTitle] = useState(project.title)
  return (
    <Sheet title="Umbenennen" onClose={onClose}>
      <h2>Neuer Name</h2>
      <input
        className="name-input"
        value={title}
        maxLength={24}
        autoFocus
        aria-label="Name"
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSave(title)
        }}
      />
      <div className="row-actions">
        <button type="button" className="ghost" onClick={onClose}>
          Abbrechen
        </button>
        <button type="button" className="primary" onClick={() => onSave(title)}>
          Speichern
        </button>
      </div>
    </Sheet>
  )
}

export function MenuDialog({
  project,
  onClose,
  onOpen,
  onRename,
  onDelete,
}: {
  project: Project
  onClose: () => void
  onOpen: () => void
  onRename: () => void
  onDelete: () => void
}) {
  return (
    <Sheet title={project.title} onClose={onClose}>
      <h2>{project.title}</h2>
      <div className="stack-actions">
        <button type="button" className="primary" onClick={onOpen}>
          Öffnen
        </button>
        <button type="button" className="ghost" onClick={onRename}>
          Umbenennen
        </button>
        <button type="button" className="danger-text" onClick={onDelete}>
          Löschen
        </button>
        <button type="button" className="ghost" onClick={onClose}>
          Abbrechen
        </button>
      </div>
    </Sheet>
  )
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string
  body: string
  confirmLabel: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      <h2>{title}</h2>
      <p className="hint left">{body}</p>
      <div className="row-actions">
        <button type="button" className="ghost" onClick={onClose}>
          Nein
        </button>
        <button type="button" className="danger-text" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}

export function ParentDialog({
  projects,
  onClose,
  onOpen,
  onRename,
  onDelete,
  onDeleteAll,
  onExportBackup,
  onImportBackup,
}: {
  projects: Project[]
  onClose: () => void
  onOpen: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onDeleteAll: () => void
  onExportBackup: () => void
  onImportBackup: (file: File) => void
}) {
  const [installable, setInstallable] = useState(canInstall())
  const [confirmAll, setConfirmAll] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => subscribeInstall(() => setInstallable(canInstall())), [])
  const sorted = [...projects].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="backdrop" role="presentation">
      <div className="sheet wide parent-sheet" role="dialog" aria-label="Einstellungen" data-dialog="settings">
        <h2>Einstellungen</h2>
        <p className="hint left">
          Projekte und Aufnahmen bleiben auf diesem Gerät. Eine Sicherung kannst du in Dateien speichern und später wieder laden.
        </p>
        <div className="row-actions">
          <button type="button" className="primary" onClick={onExportBackup}>
            Sicherung speichern
          </button>
          <button type="button" className="ghost" onClick={() => fileRef.current?.click()}>
            Sicherung laden
          </button>
        </div>
        <input
          ref={fileRef}
          className="sr"
          type="file"
          accept=".soundsalat,.zip,application/zip"
          aria-label="Sicherungsdatei"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) setPendingFile(file)
          }}
        />
        {pendingFile ? (
          <div className="row-actions">
            <p className="hint left">„{pendingFile.name}“ ersetzt alle Projekte auf diesem Gerät.</p>
            <button type="button" className="ghost" onClick={() => setPendingFile(null)}>
              Nicht laden
            </button>
            <button
              type="button"
              className="danger-text"
              onClick={() => {
                const file = pendingFile
                setPendingFile(null)
                onImportBackup(file)
              }}
            >
              Jetzt ersetzen
            </button>
          </div>
        ) : null}
        {installable ? (
          <button type="button" className="primary" onClick={() => void promptInstall()}>
            App installieren
          </button>
        ) : null}
        <ul className="parent-list">
          {sorted.length === 0 ? <li className="hint">Noch keine Projekte.</li> : null}
          {sorted.map((project) => (
            <li key={project.id}>
              <button type="button" className="linkish" onClick={() => onOpen(project.id)}>
                Öffnen
              </button>
              <input
                aria-label={`Name von ${project.title}`}
                defaultValue={project.title}
                maxLength={24}
                onBlur={(event) => onRename(project.id, event.target.value)}
              />
              <span>{formatClock(projectDuration(project.clips))}</span>
              <button type="button" className="danger-text slim" onClick={() => onDelete(project.id)}>
                Löschen
              </button>
            </li>
          ))}
        </ul>
        {confirmAll ? (
          <div className="row-actions">
            <button type="button" className="ghost" onClick={() => setConfirmAll(false)}>
              Nein
            </button>
            <button type="button" className="danger-text" onClick={onDeleteAll}>
              Ja, alles löschen
            </button>
          </div>
        ) : (
          <button type="button" className="ghost" onClick={() => setConfirmAll(true)}>
            Alle Projekte löschen
          </button>
        )}
        <button type="button" className="primary" onClick={onClose}>
          Fertig
        </button>
      </div>
    </div>
  )
}
