import type { PointerEvent as ReactPointerEvent } from 'react'
import { CATEGORIES } from '../categories.ts'
import { formatClock } from '../lib/time.ts'
import { useStore } from '../store.tsx'
import type { CategoryId, RecordingRecord } from '../types.ts'
import { Illustration } from './illustrations.tsx'
import { RecordPanel } from './RecordPanel.tsx'

export function Dock({
  category,
  recordings,
  onCategory,
  onChipDown,
  onSaveRecording,
  onPreviewBuffer,
  onEngageRecord,
}: {
  category: CategoryId | null
  recordings: RecordingRecord[]
  onCategory: (id: CategoryId) => void
  onChipDown: (event: ReactPointerEvent, soundId: string, duration: number) => void
  onSaveRecording: (blob: Blob, buffer: AudioBuffer) => void
  onPreviewBuffer: (buffer: AudioBuffer) => void
  onEngageRecord: () => void
}) {
  const active = CATEGORIES.find((item) => item.id === category)
  const background =
    category === 'mic' ? '#e23d3d' : active ? active.color : 'rgba(255,255,255,.78)'
  return (
    <div className="dock" style={{ background }}>
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
      <Tray category={category} recordings={recordings} onChipDown={onChipDown} />
      {category === 'mic' ? (
        <RecordPanel
          onSave={onSaveRecording}
          onClose={() => onCategory('mic')}
          onPreview={onPreviewBuffer}
          onEngage={onEngageRecord}
        />
      ) : null}
    </div>
  )
}

function Tray({
  category,
  recordings,
  onChipDown,
}: {
  category: CategoryId | null
  recordings: RecordingRecord[]
  onChipDown: (event: ReactPointerEvent, soundId: string, duration: number) => void
}) {
  const { sounds } = useStore()
  if (!category) return null
  const items =
    category === 'mic'
      ? recordings.map((recording) => ({
          id: `rec:${recording.id}`,
          name: recording.name,
          icon: 'mic' as const,
          duration: recording.duration,
        }))
      : sounds.filter((sound) => sound.category === category)
  if (items.length === 0) return null
  return (
    <div className="tray" data-tray={category}>
      <div className="tray-scroll">
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            className="chip"
            aria-label={`${item.name}, ${formatClock(item.duration)}`}
            onPointerDown={(event) => onChipDown(event, item.id, item.duration)}
          >
            <span className="chip-icon">
              <Illustration name={item.icon} />
            </span>
            <span className="chip-time">{formatClock(item.duration)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
