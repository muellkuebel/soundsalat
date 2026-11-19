import { formatClock } from '../lib/time.ts'
import { IconButton, UiIcon } from './ui-icons.tsx'

export function TopBar({
  time,
  playing,
  color,
  idle,
  volume,
  locked,
  canUndo,
  canRedo,
  onHome,
  onUndo,
  onRedo,
  onExport,
  onStop,
  onTogglePlay,
  onVolumeStart,
  onVolume,
  onPreview,
  onDuplicate,
  onLock,
  onTrim,
  onDelete,
}: {
  time: number
  playing: boolean
  color: string
  idle: boolean
  volume: number
  locked: boolean
  canUndo: boolean
  canRedo: boolean
  onHome: () => void
  onUndo: () => void
  onRedo: () => void
  onExport: () => void
  onStop: () => void
  onTogglePlay: () => void
  onVolumeStart: () => void
  onVolume: (value: number) => void
  onPreview: () => void
  onDuplicate: () => void
  onLock: () => void
  onTrim: () => void
  onDelete: () => void
}) {
  return (
    <header className="topbar">
      <div className="top-left">
        <button type="button" className="menu-btn" aria-label="Menü" onClick={onHome}>
          <UiIcon name="home" />
          <span>Menü</span>
        </button>
        <IconButton label="Rückgängig" name="undo" tone="light" disabled={!canUndo} onClick={onUndo} />
        <IconButton label="Wiederholen" name="redo" tone="light" disabled={!canRedo} onClick={onRedo} />
        <button type="button" className="transport stop" aria-label="Stopp" onClick={onStop}>
          <UiIcon name="stop" />
        </button>
        <button
          type="button"
          className={`transport ${playing ? 'pause' : 'play'}`}
          aria-label={playing ? 'Pause' : 'Abspielen'}
          data-transport={playing ? 'pause' : 'play'}
          onClick={onTogglePlay}
        >
          <UiIcon name={playing ? 'pause' : 'play'} />
        </button>
        <div className="top-time" data-time={formatClock(time)}>
          {formatClock(time)}
        </div>
        <IconButton label="Teilen" name="share" tone="dark" onClick={onExport} />
      </div>
      <div className={`top-right ${idle ? 'idle' : ''}`} style={idle ? undefined : { background: color }}>
        <label className="vol">
          <UiIcon name="speaker" />
          <input
            className="volume"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            aria-label="Lautstärke"
            disabled={idle}
            onPointerDown={onVolumeStart}
            onKeyDown={onVolumeStart}
            onChange={(event) => onVolume(Number(event.target.value))}
          />
        </label>
        <IconButton label="Ton anhören" name="play" disabled={idle} onClick={onPreview} />
        <IconButton label="Duplizieren" name="copy" disabled={idle} onClick={onDuplicate} />
        <IconButton label={locked ? 'Entsperren' : 'Sperren'} name={locked ? 'lock' : 'unlock'} disabled={idle} onClick={onLock} />
        <IconButton label="Zuschneiden" name="scissors" disabled={idle || locked} onClick={onTrim} />
        <IconButton label="Löschen" name="trash" tone="danger" disabled={idle || locked} onClick={onDelete} />
      </div>
    </header>
  )
}
