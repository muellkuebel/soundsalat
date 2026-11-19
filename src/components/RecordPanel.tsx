import { useEffect, useRef, useState } from 'react'
import { getEngine } from '../audio/engine.ts'
import { formatClock } from '../lib/time.ts'

const MAX_SECONDS = 45

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac']
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

export function RecordPanel({
  onSave,
  onEngage,
}: {
  onSave: (blob: Blob, buffer: AudioBuffer) => void
  onEngage: () => void
}) {
  const [phase, setPhase] = useState<'idle' | 'recording'>('idle')
  const [seconds, setSeconds] = useState(0)
  const [level, setLevel] = useState(0)
  const [error, setError] = useState('')
  const recRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedRef = useRef(0)
  const rafRef = useRef(0)
  const savingRef = useRef(false)

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (recRef.current?.state === 'recording') recRef.current.stop()
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  function stopMeter() {
    cancelAnimationFrame(rafRef.current)
    setLevel(0)
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  function watch(analyser: AnalyserNode) {
    const data = new Uint8Array(analyser.fftSize)
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const value = ((data[i] ?? 128) - 128) / 128
        sum += value * value
      }
      setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4.2))
      const elapsed = (performance.now() - startedRef.current) / 1000
      setSeconds(elapsed)
      if (elapsed >= MAX_SECONDS) {
        void stopAndSave()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  async function startRecording() {
    setError('')
    onEngage()
    getEngine().unlock()
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Aufnahme geht in diesem Browser nicht.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = pickMime()
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data)
      }
      recRef.current = recorder
      const source = getEngine().ctx.createMediaStreamSource(stream)
      const analyser = getEngine().ctx.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      recorder.start(200)
      startedRef.current = performance.now()
      setSeconds(0)
      setPhase('recording')
      watch(analyser)
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError('Das Mikrofon ist nicht erlaubt. Frag eine erwachsene Person.')
      } else if (name === 'NotFoundError') {
        setError('Kein Mikrofon gefunden.')
      } else {
        setError('Aufnahme hat nicht geklappt.')
      }
    }
  }

  function stopAndSave() {
    const recorder = recRef.current
    if (!recorder || recorder.state === 'inactive' || savingRef.current) return Promise.resolve()
    savingRef.current = true
    stopMeter()
    setPhase('idle')
    return new Promise<void>((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || chunksRef.current[0]?.type || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        stopStream()
        void blob.arrayBuffer().then(async (raw) => {
          try {
            const buffer = await getEngine().ctx.decodeAudioData(raw.slice(0))
            onSave(blob, buffer)
          } catch {
            setError('Die Aufnahme konnte nicht gelesen werden.')
            savingRef.current = false
          }
          resolve()
        })
      }
      try {
        recorder.requestData()
      } catch {
        /* ignore */
      }
      recorder.stop()
    })
  }

  return (
    <div className="record-panel" data-panel="record">
      {error ? <p className="rec-error">{error}</p> : null}
      <div className="record-bar">
        <button
          type="button"
          className={`rec-btn ${phase === 'recording' ? 'recording' : ''}`}
          aria-label={phase === 'recording' ? 'Stopp' : 'Aufnehmen'}
          data-record-phase={phase}
          onClick={() => {
            if (phase === 'recording') void stopAndSave()
            else void startRecording()
          }}
        >
          <span />
        </button>
        <div className="meter" aria-hidden="true">
          {[0.35, 0.55, 0.9, 1, 0.7, 0.42].map((height, index) => (
            <i key={index} style={{ height: `${height * 100}%`, opacity: level > index / 6 ? 1 : 0.28 }} />
          ))}
        </div>
        <div className="time-pill" data-record-time>
          {formatClock(seconds)}
        </div>
      </div>
    </div>
  )
}
