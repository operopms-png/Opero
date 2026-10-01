'use client'
// Live camera tile. Asks /api/smart-home for a stream URL (only works while the
// location is unlocked with a one-time code) and plays it: HLS via hls.js
// (Safari plays HLS natively), or an embeddable page in an iframe.
import { useEffect, useRef, useState } from 'react'

type Api = (body: any) => Promise<any>

export default function CameraPlayer({ deviceId, api, height = 190, onFull }: { deviceId: string; api: Api; height?: number | string; onFull?: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [src, setSrc] = useState<{ url: string; type: string } | null>(null)
  const [err, setErr] = useState('')
  const [tries, setTries] = useState(0)

  useEffect(() => {
    let dead = false
    setErr(''); setSrc(null)
    api({ action: 'stream', device_id: deviceId }).then(r => { if (!dead) setSrc(r) }).catch(e => { if (!dead) setErr(e.message) })
    return () => { dead = true }
  }, [deviceId, api, tries])

  useEffect(() => {
    if (!src || src.type !== 'hls' || !video.current) return
    const el = video.current
    let hls: any
    if (el.canPlayType('application/vnd.apple.mpegurl')) { el.src = src.url; el.play().catch(() => {}) }
    else import('hls.js').then(({ default: Hls }) => {
      if (!Hls.isSupported()) { setErr('This browser can’t play the live view'); return }
      hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 2 })
      hls.on(Hls.Events.ERROR, (_: any, d: any) => { if (d?.fatal) setErr('The live view stopped — retry') })
      hls.loadSource(src.url); hls.attachMedia(el); el.play().catch(() => {})
    })
    return () => { try { hls?.destroy() } catch {}; el.removeAttribute('src') }
  }, [src])

  const box: React.CSSProperties = { height, background: '#111', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 13 }
  if (err) return <div style={{ ...box, flexDirection: 'column', gap: 8, padding: 12, textAlign: 'center' }}>⚠ {err}<button onClick={() => setTries(t => t + 1)} style={{ background: '#333', color: '#fff', border: 'none', borderRadius: 4, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>Retry</button></div>
  if (!src) return <div style={box}>Connecting…</div>
  return (
    <div style={box}>
      {src.type === 'hls'
        ? <video ref={video} muted playsInline autoPlay controls={false} style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }} />
        : <iframe src={src.url} title="Live camera" allow="autoplay; fullscreen" style={{ width: '100%', height: '100%', border: 'none' }} />}
      <span style={{ position: 'absolute', top: 8, left: 8, background: '#DF2F4A', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 3, padding: '2px 6px' }}>● LIVE</span>
      {onFull && <button onClick={onFull} style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,.6)', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>⤢ Full screen</button>}
    </div>
  )
}
