import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { appearance } from '../appearance.ts'
import { GUTTER, LANES, PPS } from '../layout.ts'
import { clipLength, formatClip } from '../lib/time.ts'
import type { Clip } from '../types.ts'
import { SoundIcon } from './SoundIcon.tsx'
import { UiIcon } from './ui-icons.tsx'

export function Timeline({
  scrollRef,
  clips,
  playhead,
  seconds,
  selectedId,
  preview,
  onClipPointerDown,
  onClipPointerMove,
  onClipPointerUp,
  onPlayheadPointerDown,
  onPlayheadPointerMove,
  onPlayheadPointerUp,
  onScroll,
  onBackground,
}: {
  scrollRef: RefObject<HTMLDivElement | null>
  clips: Clip[]
  playhead: number
  seconds: number
  selectedId: string | null
  preview: { soundId: string; lane: number; startTime: number; duration: number } | null
  onClipPointerDown: (event: ReactPointerEvent, clip: Clip) => void
  onClipPointerMove: (event: ReactPointerEvent) => void
  onClipPointerUp: (event: ReactPointerEvent) => void
  onPlayheadPointerDown: (event: ReactPointerEvent) => void
  onPlayheadPointerMove: (event: ReactPointerEvent) => void
  onPlayheadPointerUp: (event: ReactPointerEvent) => void
  onScroll: () => void
  onBackground: () => void
}) {
  const width = GUTTER + seconds * PPS + 48
  return (
    <div className="timeline-scroll" ref={scrollRef} data-timeline onScroll={onScroll}>
      <div className="timeline-canvas" style={{ width }} onPointerDown={onBackground}>
        <div className="lanes">
          {Array.from({ length: LANES }, (_, lane) => (
            <div className="lane" key={lane} data-lane={lane}>
              {clips
                .filter((clip) => clip.lane === lane)
                .map((clip) => {
                  const look = appearance(clip.soundId)
                  const length = clipLength(clip)
                  return (
                    <button
                      type="button"
                      key={clip.id}
                      className={`clip ${clip.id === selectedId ? 'selected' : ''}`}
                      data-clip={clip.id}
                      style={{
                        left: GUTTER + clip.startTime * PPS,
                        width: Math.max(58, length * PPS),
                        background: `linear-gradient(180deg, color-mix(in srgb, ${look.color} 78%, white), ${look.color})`,
                      }}
                      onPointerDown={(event) => onClipPointerDown(event, clip)}
                      onPointerMove={onClipPointerMove}
                      onPointerUp={onClipPointerUp}
                      onPointerCancel={onClipPointerUp}
                    >
                      <span className="clip-badge">
                        <SoundIcon id={clip.soundId} />
                      </span>
                      {length * PPS > 78 ? <span className="clip-dur">{formatClip(length)}</span> : null}
                      {clip.locked ? (
                        <span className="clip-lock" aria-hidden="true">
                          <UiIcon name="lock" />
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              {preview && preview.lane === lane ? (
                <div
                  className="clip ghost"
                  style={{
                    left: GUTTER + preview.startTime * PPS,
                    width: Math.max(58, preview.duration * PPS),
                    background: appearance(preview.soundId).color,
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
        <div className="playhead" style={{ transform: `translate3d(${GUTTER + playhead * PPS}px, 0, 0)` }} data-playhead>
          <button
            type="button"
            className="playhead-handle"
            aria-label="Abspielposition"
            onPointerDown={onPlayheadPointerDown}
            onPointerMove={onPlayheadPointerMove}
            onPointerUp={onPlayheadPointerUp}
          >
            <UiIcon name="pause" />
          </button>
        </div>
        {clips.length === 0 && !preview ? <div className="empty-hint">Tippe einen Ton an oder zieh ihn nach oben</div> : null}
      </div>
    </div>
  )
}

export function Minimap({
  clips,
  seconds,
  playhead,
  scrollLeft,
  viewWidth,
  contentWidth,
  onScrub,
}: {
  clips: Clip[]
  seconds: number
  playhead: number
  scrollLeft: number
  viewWidth: number
  contentWidth: number
  onScrub: (ratio: number) => void
}) {
  const total = Math.max(seconds, 0.1)
  return (
    <div
      className="minimap"
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const ratio = (event.clientX - rect.left) / rect.width
        onScrub(Math.min(1, Math.max(0, ratio)))
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
        const rect = event.currentTarget.getBoundingClientRect()
        const ratio = (event.clientX - rect.left) / rect.width
        onScrub(Math.min(1, Math.max(0, ratio)))
      }}
    >
      {clips.map((clip) => {
        const look = appearance(clip.soundId)
        const length = clipLength(clip)
        return (
          <i
            key={clip.id}
            style={{
              left: `${(clip.startTime / total) * 100}%`,
              width: `${Math.max(0.8, (length / total) * 100)}%`,
              top: 6 + clip.lane * 5,
              background: look.color,
            }}
          />
        )
      })}
      <div
        className="minimap-view"
        style={{
          left: `${(scrollLeft / Math.max(contentWidth, 1)) * 100}%`,
          width: `${(viewWidth / Math.max(contentWidth, 1)) * 100}%`,
        }}
      />
      <div className="minimap-play" style={{ left: `${(playhead / total) * 100}%` }} />
    </div>
  )
}
