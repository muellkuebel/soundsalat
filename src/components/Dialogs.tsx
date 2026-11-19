import { useEffect, useState, type ReactNode } from 'react'
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
          <p>Töne auf die Spuren ziehen</p>
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

function makeQuestion() {
  const a = 3 + Math.floor(Math.random() * 7)
  const b = 3 + Math.floor(Math.random() * 7)
  return { a, b, answer: a + b }
}

export function GateDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [question, setQuestion] = useState(makeQuestion)
  const [digits, setDigits] = useState('')
  const [tries, setTries] = useState(0)
  const [shake, setShake] = useState(false)
  const [hint, setHint] = useState('')

  function push(digit: string) {
    setDigits((current) => (current.length >= 2 ? current : current + digit))
    setHint('')
  }

  function submit() {
    if (!digits) return
    if (Number(digits) === question.answer) {
      onSuccess()
      return
    }
    setShake(true)
    setDigits('')
    const nextTries = tries + 1
    setTries(nextTries)
    if (nextTries >= 3) {
      setQuestion(makeQuestion())
      setTries(0)
      setHint('Frag eine erwachsene Person.')
    } else {
      setHint('Das stimmt nicht. Nochmal.')
    }
    window.setTimeout(() => setShake(false), 420)
  }

  return (
    <Sheet title="Für Eltern" onClose={onClose}>
      <h2>Nur für Erwachsene</h2>
      <p className="gate-q">
        Was ist {question.a} + {question.b}?
      </p>
      <div className={`gate-display ${shake ? 'shake' : ''}`} aria-live="polite">
        {digits || '–'}
      </div>
      {hint ? <p className="hint">{hint}</p> : <p className="hint">&nbsp;</p>}
      <div className="pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button type="button" key={digit} onClick={() => push(digit)}>
            {digit}
          </button>
        ))}
        <button type="button" onClick={() => setDigits((current) => current.slice(0, -1))} aria-label="Löschen">
          ⌫
        </button>
        <button type="button" onClick={() => push('0')}>
          0
        </button>
        <button type="button" className="pad-ok" onClick={submit}>
          OK
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
}: {
  projects: Project[]
  onClose: () => void
  onOpen: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onDeleteAll: () => void
}) {
  const [installable, setInstallable] = useState(canInstall())
  const [confirmAll, setConfirmAll] = useState(false)
  useEffect(() => subscribeInstall(() => setInstallable(canInstall())), [])
  const sorted = [...projects].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="backdrop" role="presentation">
      <div className="sheet wide parent-sheet" role="dialog" aria-label="Für Eltern">
        <h2>Für Eltern</h2>
        <p className="hint left">
          Projekte und Aufnahmen bleiben auf diesem Gerät, in diesem Browser. Nichts wird hochgeladen.
        </p>
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
