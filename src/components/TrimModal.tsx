import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { getEngine } from '../audio/engine.ts'
import { computePeaks } from '../audio/waveform.ts'
import { clampTrim } from '../lib/time.ts'
import { IconButton, UiIcon } from './ui-icons.tsx'

export function TrimModal({
  buffer,
  trimStart,
  trimEnd,
  onClose,
  onSave,
}: {
  buffer: AudioBuffer
  trimStart: number
  trimEnd: number
  onClose: () => void
  onSave: (start: number, end: number) => void
}) {
  const duration = Math.max(0.1, buffer.duration)
  const initial = clampTrim(trimStart, trimEnd || duration, duration)
  const [start, setStart] = useState(initial.start)
  const [end, setEnd] = useState(initial.end)
  const [pos, setPos] = useState(initial.start)
  const [playing, setPlaying] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playAnchor = useRef({ contextTime: 0, offset: 0 })
  const edges = useRef({ start: initial.start, end: initial.end })
  useEffect(() => {
    edges.current = { start, end }
  }, [start, end])

  useEffect(() => {
    const stage = stageRef.current
    const canvas = canvasRef.current
    if (!stage || !canvas) return
    const draw = () => {
      const width = stage.clientWidth
      const height = stage.clientHeight
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(width * ratio))
      canvas.height = Math.max(1, Math.floor(height * ratio))
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      const peaks = computePeaks(buffer, Math.max(40, Math.floor(width / 3)))
      const startX = (edges.current.start / duration) * width
      const endX = (edges.current.end / duration) * width
      let loud = 0.02
      for (const peak of peaks) loud = Math.max(loud, Math.abs(peak.max), Math.abs(peak.min))
      const gain = 0.92 / loud
      peaks.forEach((peak, index) => {
        const x = (index / peaks.length) * width
        ctx.fillStyle = x >= startX && x <= endX ? '#8a8a8a' : '#c45d74'
        const top = Math.max(-1, Math.min(1, peak.max * gain))
        const bottom = Math.max(-1, Math.min(1, peak.min * gain))
        const y1 = (1 - top) * 0.5 * height
        const y2 = (1 - bottom) * 0.5 * height
        ctx.fillRect(x, y1, Math.max(1.5, width / peaks.length - 0.8), Math.max(1, y2 - y1))
      })
    }
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [buffer, duration, start, end])

  useEffect(() => () => getEngine().stopPreview(), [])

  useEffect(() => {
    if (!playing) return
    let frame = 0
    const tick = () => {
      const elapsed = getEngine().ctx.currentTime - playAnchor.current.contextTime
      const next = playAnchor.current.offset + elapsed
      if (next >= edges.current.end) {
        setPlaying(false)
        setPos(edges.current.start)
        return
      }
      setPos(next)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing])

  function timeAt(clientX: number) {
    const stage = stageRef.current
    if (!stage) return 0
    const rect = stage.getBoundingClientRect()
    return Math.min(duration, Math.max(0, ((clientX - rect.left) / rect.width) * duration))
  }

  function stopPlayback() {
    getEngine().stopPreview()
    setPlaying(false)
  }

  function moveHandle(which: 'start' | 'end', clientX: number) {
    const time = timeAt(clientX)
    const next =
      which === 'start'
        ? clampTrim(time, edges.current.end, duration)
        : clampTrim(edges.current.start, time, duration)
    setStart(next.start)
    setEnd(next.end)
    if (!playing) setPos(which === 'start' ? next.start : Math.min(pos, next.end))
  }

  function togglePlay() {
    const engine = getEngine()
    engine.unlock()
    if (playing) {
      stopPlayback()
      return
    }
    const from = pos >= start && pos < end - 0.05 ? pos : start
    setPos(from)
    playAnchor.current = { contextTime: engine.ctx.currentTime, offset: from }
    setPlaying(true)
    engine.preview(buffer, from, Math.max(0.05, end - from), 1, () => {
      setPlaying(false)
      setPos(edges.current.start)
    })
  }

  const startPct = (start / duration) * 100
  const endPct = (end / duration) * 100
  const posPct = (pos / duration) * 100

  const bind = (which: 'start' | 'end') => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      stopPlayback()
      event.currentTarget.setPointerCapture(event.pointerId)
      moveHandle(which, event.clientX)
    },
    onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
      moveHandle(which, event.clientX)
    },
  })

  return (
    <div className="backdrop" data-panel="trim">
      <div className="trim-modal" role="dialog" aria-label="Zuschneiden">
        <header className="trim-head">
          <IconButton label={playing ? 'Stopp' : 'Abspielen'} name={playing ? 'stop' : 'play'} onClick={togglePlay} />
          <div className="trim-actions">
            <IconButton label="Fertig" name="check" onClick={() => onSave(start, end)} />
            <IconButton label="Abbrechen" name="close" onClick={onClose} />
          </div>
        </header>
        <div className="trim-stage" ref={stageRef}>
          <canvas ref={canvasRef} />
          <div className="trim-shade" style={{ width: `${startPct}%` }} />
          <div className="trim-shade right" style={{ width: `${100 - endPct}%` }} />
          <div className="trim-edge" style={{ left: `${startPct}%` }} />
          <div className="trim-edge" style={{ left: `${endPct}%` }} />
          <button type="button" className="trim-handle" style={{ left: `${startPct}%` }} aria-label="Anfang" {...bind('start')}>
            <UiIcon name="chevronRight" />
          </button>
          <button type="button" className="trim-handle" style={{ left: `${endPct}%` }} aria-label="Ende" {...bind('end')}>
            <UiIcon name="chevronLeft" />
          </button>
          <div className="trim-playhead" style={{ left: `${posPct}%` }} />
        </div>
      </div>
    </div>
  )
}
