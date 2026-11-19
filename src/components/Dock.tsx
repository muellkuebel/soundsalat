import type { PointerEvent as ReactPointerEvent } from 'react'
import { CATEGORIES } from '../categories.ts'
import { formatClock } from '../lib/time.ts'
import { useStore } from '../store.tsx'
import type { CategoryId, RecordingRecord } from '../types.ts'
import { Illustration } from './illustrations.tsx'
import { RecordPanel } from './RecordPanel.tsx'
import { SoundIcon } from './SoundIcon.tsx'
import { UiIcon } from './ui-icons.tsx'

export function Dock({
  category,
  recordings,
  auditionId,
  onCategory,
  onChipDown,
  onAdd,
  onSaveRecording,
  onEngageRecord,
}: {
  category: CategoryId | null
  recordings: RecordingRecord[]
  auditionId: string | null
  onCategory: (id: CategoryId) => void
  onChipDown: (event: ReactPointerEvent, soundId: string, duration: number) => void
  onAdd: (soundId: string, duration: number) => void
  onSaveRecording: (blob: Blob, buffer: AudioBuffer) => void
  onEngageRecord: () => void
}) {
  const active = CATEGORIES.find((item) => item.id === category)
  const background = category === 'mic' ? '#e23d3d' : active ? active.color : 'transparent'
  return (
    <div className="dock">
      <div className="cats">
        {CATEGORIES.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`cat ${category === item.id ? 'active' : ''}`}
            style={{ background: item.color }}
            aria-label={item.name}
            aria-pressed={category === item.id}
            data-category={item.id}
            onClick={() => onCategory(item.id)}
          >
            <Illustration name={item.icon} />
          </button>
        ))}
      </div>
      {category ? (
        <div className="tray-panel" style={{ background }} data-tray-panel={category}>
          <Tray
            category={category}
            recordings={recordings}
            auditionId={auditionId}
            onChipDown={onChipDown}
            onAdd={onAdd}
          />
          {category === 'mic' ? <RecordPanel onSave={onSaveRecording} onEngage={onEngageRecord} /> : null}
        </div>
      ) : null}
    </div>
  )
}

function Tray({
  category,
  recordings,
  auditionId,
  onChipDown,
  onAdd,
}: {
  category: CategoryId
  recordings: RecordingRecord[]
  auditionId: string | null
  onChipDown: (event: ReactPointerEvent, soundId: string, duration: number) => void
  onAdd: (soundId: string, duration: number) => void
}) {
  const { sounds } = useStore()
  const items =
    category === 'mic'
      ? recordings.map((recording) => ({
          id: `rec:${recording.id}`,
          name: recording.name,
          duration: recording.duration,
        }))
      : sounds
          .filter((sound) => sound.category === category)
          .map((sound) => ({ id: sound.id, name: sound.name, duration: sound.duration }))
  if (items.length === 0 && category !== 'mic') return null
  return (
    <div className="tray" data-tray={category}>
      {items.length === 0 ? <p className="tray-empty">Noch keine Aufnahme</p> : null}
      {items.length === 0 ? null : (
      <div className="tray-scroll">
        {items.map((item) => {
          const playing = auditionId === item.id
          return (
            <div key={item.id} className={`chip ${playing ? 'playing' : ''}`} data-sound={item.id}>
              <button
                type="button"
                className="chip-hit"
                aria-label={`${item.name}, ${formatClock(item.duration)}`}
                aria-pressed={playing}
                onPointerDown={(event) => onChipDown(event, item.id, item.duration)}
              >
                <span className="chip-icon">
                  <SoundIcon id={item.id} />
                </span>
                <span className="chip-time">{formatClock(item.duration)}</span>
              </button>
              {playing ? (
                <button
                  type="button"
                  className="chip-add"
                  aria-label={`${item.name} hinzufügen`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    onAdd(item.id, item.duration)
                  }}
                >
                  <UiIcon name="plus" />
                </button>
              ) : null}
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
