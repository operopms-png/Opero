'use client'
// Help Centre: video walkthroughs of the platform and the step-by-step guide.
// Open to everyone who can sign in (hidden from Partners, who only see the pages they were granted).
import { useState } from 'react'
import GuidePanel from '@/components/settings/GuidePanel'
import { HELP_VIDEOS, type HelpVideo } from '@/lib/help-videos'

const C = { ink: '#10234d', text: '#34456b', muted: '#6b7a9f', blue: '#2f5bd6', soft: '#eaf0fd', line: '#dfe6f4' }
const shadow = '0 1px 2px rgba(16,35,77,.05), 0 8px 24px rgba(16,35,77,.06)'

function VideoCard({ v, playing, onPlay }: { v: HelpVideo; playing: boolean; onPlay: () => void }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, overflow: 'hidden', boxShadow: shadow }}>
      {playing ? (
        <video src={`/help/${v.id}.mp4`} poster={`/help/${v.id}.jpg`} controls autoPlay playsInline preload="metadata"
          style={{ width: '100%', display: 'block', background: '#000', aspectRatio: '9 / 16', maxHeight: 520, objectFit: 'contain' }} />
      ) : (
        <button onClick={onPlay} aria-label={`Play ${v.title}`}
          style={{ position: 'relative', display: 'block', width: '100%', padding: 0, border: 0, cursor: 'pointer', background: '#0b1f3a' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/help/${v.id}.jpg`} alt="" style={{ width: '100%', display: 'block', aspectRatio: '9 / 16', maxHeight: 520, objectFit: 'cover' }} />
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(0,0,0,.3)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill={C.ink}><path d="M8 5v14l11-7z" /></svg>
            </span>
          </span>
          <span style={{ position: 'absolute', right: 10, bottom: 10, background: 'rgba(11,31,58,.85)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 6 }}>{v.length}</span>
        </button>
      )}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{v.title}</div>
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{v.blurb}</div>
      </div>
    </div>
  )
}

export default function HelpCentre() {
  const [tab, setTab] = useState<'videos' | 'guide'>('videos')
  const [playing, setPlaying] = useState<string>('')
  const tabBtn = (id: 'videos' | 'guide', label: string) => (
    <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id}
      style={{ padding: '8px 16px', borderRadius: 999, border: `1px solid ${tab === id ? C.blue : C.line}`, background: tab === id ? C.soft : '#fff', color: tab === id ? C.blue : C.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
      {label}
    </button>
  )
  return (
    <div style={{ padding: '4px 0 40px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {tabBtn('videos', 'Video walkthroughs')}
        {tabBtn('guide', 'Step-by-step guide')}
      </div>
      {tab === 'videos' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 }}>
          {HELP_VIDEOS.map(v => <VideoCard key={v.id} v={v} playing={playing === v.id} onPlay={() => setPlaying(v.id)} />)}
        </div>
      ) : (
        <GuidePanel />
      )}
    </div>
  )
}
