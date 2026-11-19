import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { appearance } from '../appearance.ts'
import { getEngine } from '../audio/engine.ts'
import { downloadBlob, renderProjectWav } from '../audio/exportWav.ts'
import { getBuffer } from '../audio/library.ts'
import { GUTTER, LANES, MIN_TIMELINE, PPS } from '../layout.ts'
import { clipLength, projectDuration, safeFileBase, snapTime, uid } from '../lib/time.ts'
import { useStore } from '../store.tsx'
import type { CategoryId, Clip } from '../types.ts'
import { Dock } from './Dock.tsx'
import { Illustration } from './illustrations.tsx'
import { Minimap, Timeline } from './Timeline.tsx'
import { TopBar } from './TopBar.tsx'
import { TrimModal } from './TrimModal.tsx'

type MoveDrag = {
  pointerId: number
  clipId: string
  originStart: number
  originLane: number
  startX: number
  startY: number
  moved: boolean
}

function freeLane(clips: Clip[], start: number, duration: number) {
  for (let lane = 0; lane < LANES; lane++) {
    const overlap = clips.some((clip) => {
      if (clip.lane !== lane) return false
      const end = clip.startTime + clipLength(clip)
      return clip.startTime < start + duration && end > start
    })
    if (!overlap) return lane
  }
  return 0
}

export function Editor({ projectId }: { projectId: string }) {
  const store = useStore()
  const project = store.projects.find((item) => item.id === projectId) ?? null
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [playhead, setPlayhead] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [trim, setTrim] = useState<{ clip: Clip; buffer: AudioBuffer } | null>(null)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [viewWidth, setViewWidth] = useState(1)
  const [ghost, setGhost] = useState<{ x: number; y: number; soundId: string } | null>(null)
  const [preview, setPreview] = useState<{ soundId: string; lane: number; startTime: number; duration: number } | null>(
    null,
  )
  const [moveOverride, setMoveOverride] = useState<{ id: string; startTime: number; lane: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef(0)
  const playingRef = useRef(false)
  const dragRef = useRef<MoveDrag | null>(null)
  const scrubbing = useRef(false)
  const selectedRef = useRef<string | null>(null)
  selectedRef.current = selectedId
  const storeRef = useRef(store)
  storeRef.current = store
  const projectRef = useRef(project)
  projectRef.current = project

  function setTime(time: number) {
    const next = Math.max(0, time)
    playheadRef.current = next
    setPlayhead(next)
  }

  function pause() {
    const time = playingRef.current ? getEngine().pause() : playheadRef.current
    playingRef.current = false
    setPlaying(false)
    setTime(time)
  }

  function stopAll() {
    getEngine().stop()
    playingRef.current = false
    setPlaying(false)
    setTime(0)
    scrollRef.current?.scrollTo({ left: 0 })
  }

  async function startPlayback(from: number) {
    const engine = getEngine()
    engine.unlock()
    const current = projectRef.current
    if (!current || current.clips.length === 0) {
      storeRef.current.showToast('Noch keine Töne im Salat.')
      return
    }
    const items: { clip: Clip; buffer: AudioBuffer }[] = []
    for (const clip of current.clips) {
      try {
        items.push({ clip, buffer: await getBuffer(clip.soundId) })
      } catch {
        /* skip a missing sound */
      }
    }
    if (!items.length) {
      storeRef.current.showToast('Töne werden noch vorbereitet.')
      return
    }
    const end = Math.max(projectDuration(current.clips) + 0.05, from + 0.2)
    playingRef.current = true
    setPlaying(true)
    setTime(from)
    engine.play(items, from, end)
  }

  function togglePlay() {
    if (playingRef.current) {
      pause()
      return
    }
    const end = projectDuration(projectRef.current?.clips ?? [])
    const from = playheadRef.current >= Math.max(0, end - 0.05) ? 0 : playheadRef.current
    void startPlayback(from)
  }

  function seek(time: number) {
    if (playingRef.current) void startPlayback(Math.max(0, time))
    else setTime(time)
  }

  useEffect(() => {
    const engine = getEngine()
    engine.onTime = (time) => {
      playheadRef.current = time
      const scroller = scrollRef.current
      if (scroller) {
        const x = GUTTER + time * PPS
        const right = scroller.scrollLeft + scroller.clientWidth
        if (x > right - 100) scroller.scrollLeft = x - scroller.clientWidth * 0.35
        else if (x < scroller.scrollLeft + 36) scroller.scrollLeft = Math.max(0, x - 48)
      }
      setPlayhead(time)
    }
    engine.onEnded = () => {
      playingRef.current = false
      setPlaying(false)
      setPlayhead(playheadRef.current)
    }
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (event.code === 'Space') {
        event.preventDefault()
        togglePlay()
      } else if (event.key === 'Escape') {
        setTrim(null)
        setCategory(null)
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        const current = projectRef.current
        const clip = current?.clips.find((item) => item.id === selectedRef.current)
        if (current && clip && !clip.locked) {
          storeRef.current.removeClip(current.id, clip.id)
          setSelectedId(null)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      engine.onTime = () => {}
      engine.onEnded = () => {}
      engine.stop()
    }
    // Keyboard and transport stay bound for the lifetime of the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const update = () => setViewWidth(element.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [projectId, category])

  if (!project) return null
  const story = project

  const clips = story.clips.map((clip) =>
    moveOverride && moveOverride.id === clip.id
      ? { ...clip, startTime: moveOverride.startTime, lane: moveOverride.lane }
      : clip,
  )
  const selected = clips.find((clip) => clip.id === selectedId) ?? null
  const look = selected ? appearance(selected.soundId) : null
  const duration = projectDuration(clips)
  const seconds = Math.max(MIN_TIMELINE, duration + 8, playhead + 6)
  const contentWidth = GUTTER + seconds * PPS + 48
  const recordings = store.recordings.filter((recording) => recording.projectId === story.id)

  function locate(clientX: number, clientY: number) {
    const element = scrollRef.current
    if (!element) return null
    const rect = element.getBoundingClientRect()
    const over = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
    const x = clientX - rect.left + element.scrollLeft - GUTTER
    const y = clientY - rect.top
    const lane = Math.min(LANES - 1, Math.max(0, Math.floor((y / Math.max(rect.height, 1)) * LANES)))
    return { over, time: Math.max(0, x / PPS), lane }
  }

  async function place(soundId: string, lane: number, start: number) {
    try {
      const buffer = await getBuffer(soundId)
      const clip: Clip = {
        id: uid(),
        soundId,
        lane,
        startTime: snapTime(start),
        trimStart: 0,
        trimEnd: buffer.duration,
        volume: 1,
        locked: false,
      }
      store.addClip(story.id, clip)
      setSelectedId(clip.id)
    } catch {
      store.showToast('Ton konnte nicht geladen werden.')
    }
  }

  function onChipDown(event: ReactPointerEvent, soundId: string, durationHint: number) {
    if (event.button !== 0) return
    const pointerId = event.pointerId
    const startX = event.clientX
    const startY = event.clientY
    let moved = false
    let scrolling = false
    let drop = { over: false, time: playheadRef.current, lane: 0 }
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (!moved && !scrolling) {
        if (Math.hypot(dx, dy) < 10) return
        if (Math.abs(dx) > Math.abs(dy)) {
          scrolling = true
          return
        }
        moved = true
      }
      if (scrolling) return
      const hit = locate(ev.clientX, ev.clientY)
      drop = {
        over: Boolean(hit?.over),
        time: hit ? snapTime(Math.max(0, hit.time - Math.min(0.35, durationHint * 0.2))) : drop.time,
        lane: hit ? hit.lane : drop.lane,
      }
      setGhost({ x: ev.clientX, y: ev.clientY, soundId })
      setPreview(drop.over ? { soundId, lane: drop.lane, startTime: drop.time, duration: durationHint } : null)
    }
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setGhost(null)
      setPreview(null)
      if (scrolling) return
      const current = projectRef.current?.clips ?? []
      if (!moved) {
        void place(soundId, freeLane(current, playheadRef.current, durationHint), playheadRef.current)
        return
      }
      if (drop.over) void place(soundId, drop.lane, drop.time)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  function onClipPointerDown(event: ReactPointerEvent, clip: Clip) {
    if (event.button !== 0) return
    event.stopPropagation()
    setSelectedId(clip.id)
    if (clip.locked) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      clipId: clip.id,
      originStart: clip.startTime,
      originLane: clip.lane,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    }
  }

  function onClipPointerMove(event: ReactPointerEvent) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(dx, dy) < 6) return
    drag.moved = true
    const hit = locate(event.clientX, event.clientY)
    setMoveOverride({
      id: drag.clipId,
      startTime: snapTime(Math.max(0, drag.originStart + dx / PPS)),
      lane: hit ? hit.lane : drag.originLane,
    })
  }

  function onClipPointerUp(event: ReactPointerEvent) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (drag.moved) {
      const dx = event.clientX - drag.startX
      const hit = locate(event.clientX, event.clientY)
      store.updateClip(story.id, drag.clipId, {
        startTime: snapTime(Math.max(0, drag.originStart + dx / PPS)),
        lane: hit ? hit.lane : drag.originLane,
      })
    }
    setMoveOverride(null)
  }

  function onPlayheadPointerDown(event: ReactPointerEvent) {
    event.stopPropagation()
    pause()
    scrubbing.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    const hit = locate(event.clientX, event.clientY)
    if (hit) setTime(hit.time)
  }

  function onPlayheadPointerMove(event: ReactPointerEvent) {
    if (!scrubbing.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    const hit = locate(event.clientX, event.clientY)
    if (hit) setTime(hit.time)
  }

  async function previewSelected() {
    if (!selected) return
    pause()
    getEngine().unlock()
    const buffer = await getBuffer(selected.soundId)
    getEngine().preview(buffer, selected.trimStart, Math.max(0.05, clipLength(selected)), selected.volume)
  }

  async function exportMix() {
    const current = projectRef.current
    if (!current || current.clips.length === 0) {
      store.showToast('Noch keine Töne im Salat.')
      return
    }
    store.showToast('Wird gemischt …')
    try {
      const buffers = new Map<string, AudioBuffer>()
      for (const clip of current.clips) buffers.set(clip.soundId, await getBuffer(clip.soundId))
      const blob = await renderProjectWav(current.clips, buffers)
      const file = new File([blob], `${safeFileBase(current.title)}.wav`, { type: 'audio/wav' })
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: current.title })
          store.showToast('Geteilt')
          return
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return
        }
      }
      downloadBlob(blob, file.name)
      store.showToast('WAV gespeichert')
    } catch {
      store.showToast('Mischen hat nicht geklappt.')
    }
  }

  async function openTrim() {
    if (!selected || selected.locked) return
    pause()
    try {
      const buffer = await getBuffer(selected.soundId)
      setTrim({ clip: selected, buffer })
    } catch {
      store.showToast('Ton konnte nicht geladen werden.')
    }
  }

  const ghostLook = ghost ? appearance(ghost.soundId) : null

  return (
    <div className="editor" data-screen="editor">
      <TopBar
        time={playhead}
        playing={playing}
        color={look?.color ?? '#d7e8c4'}
        idle={!selected}
        volume={selected?.volume ?? 1}
        locked={Boolean(selected?.locked)}
        onHome={() => {
          stopAll()
          store.goHome()
        }}
        onExport={() => void exportMix()}
        onStop={stopAll}
        onTogglePlay={togglePlay}
        onVolume={(value) => {
          if (!selected) return
          store.updateClip(story.id, selected.id, { volume: value })
          getEngine().setClipVolume(selected.id, value)
        }}
        onPreview={() => void previewSelected()}
        onDuplicate={() => {
          if (!selected) return
          const copy: Clip = {
            ...selected,
            id: uid(),
            startTime: snapTime(selected.startTime + clipLength(selected) + 0.1),
            locked: false,
          }
          store.addClip(story.id, copy)
          setSelectedId(copy.id)
        }}
        onLock={() => {
          if (!selected) return
          store.updateClip(story.id, selected.id, { locked: !selected.locked })
        }}
        onTrim={() => void openTrim()}
        onDelete={() => {
          if (!selected || selected.locked) return
          store.removeClip(story.id, selected.id)
          setSelectedId(null)
        }}
      />
      <Minimap
        clips={clips}
        seconds={seconds}
        playhead={playhead}
        scrollLeft={scrollLeft}
        viewWidth={viewWidth}
        contentWidth={contentWidth}
        onScrub={(ratio) => {
          const time = ratio * seconds
          const element = scrollRef.current
          if (element) element.scrollLeft = Math.max(0, GUTTER + time * PPS - element.clientWidth / 2)
          seek(time)
        }}
      />
      <Timeline
        scrollRef={scrollRef}
        clips={clips}
        playhead={playhead}
        seconds={seconds}
        selectedId={selectedId}
        preview={preview}
        onClipPointerDown={onClipPointerDown}
        onClipPointerMove={onClipPointerMove}
        onClipPointerUp={onClipPointerUp}
        onPlayheadPointerDown={onPlayheadPointerDown}
        onPlayheadPointerMove={onPlayheadPointerMove}
        onPlayheadPointerUp={() => {
          scrubbing.current = false
        }}
        onScroll={() => setScrollLeft(scrollRef.current?.scrollLeft ?? 0)}
        onBackground={() => setSelectedId(null)}
      />
      <Dock
        category={category}
        recordings={recordings}
        onCategory={(id) => setCategory((current) => (current === id ? null : id))}
        onChipDown={onChipDown}
        onEngageRecord={pause}
        onPreviewBuffer={(buffer) => {
          pause()
          getEngine().unlock()
          getEngine().preview(buffer, 0, buffer.duration, 1)
        }}
        onSaveRecording={(blob, buffer) => {
          const count = recordings.length + 1
          const id = uid()
          store.addRecording(
            {
              id,
              projectId: story.id,
              name: `Aufnahme ${count}`,
              duration: buffer.duration,
              createdAt: Date.now(),
              blob,
            },
            buffer,
          )
          void place(`rec:${id}`, freeLane(story.clips, playheadRef.current, buffer.duration), playheadRef.current)
        }}
      />
      {ghost && ghostLook ? (
        <div className="drag-ghost" style={{ left: ghost.x, top: ghost.y, background: ghostLook.color }}>
          <span className="clip-badge">
            <Illustration name={ghostLook.icon} />
          </span>
          <span>{ghostLook.name}</span>
        </div>
      ) : null}
      {trim ? (
        <TrimModal
          buffer={trim.buffer}
          trimStart={trim.clip.trimStart}
          trimEnd={trim.clip.trimEnd}
          onClose={() => setTrim(null)}
          onSave={(start, end) => {
            store.updateClip(story.id, trim.clip.id, { trimStart: start, trimEnd: end })
            setTrim(null)
          }}
        />
      ) : null}
    </div>
  )
}
