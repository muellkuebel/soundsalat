import { formatClock } from '../lib/time.ts'
import { IconButton } from './ui-icons.tsx'
import { UiIcon } from './ui-icons.tsx'

export function TopBar({
  time,
  playing,
  color,
  idle,
  volume,
  locked,
  onHome,
  onExport,
  onStop,
  onTogglePlay,
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
  onHome: () => void
  onExport: () => void
  onStop: () => void
  onTogglePlay: () => void
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
        <IconButton label="Zur Übersicht" name="home" tone="light" onClick={onHome} />
        <IconButton label="Teilen" name="share" tone="dark" onClick={onExport} />
        <IconButton label="Stopp" name="stop" tone="dark" onClick={onStop} />
        <IconButton label={playing ? 'Pause' : 'Abspielen'} name={playing ? 'pause' : 'play'} tone="dark" onClick={onTogglePlay} />
        <div className="top-time" data-time={formatClock(time)}>
          {formatClock(time)}
        </div>
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
