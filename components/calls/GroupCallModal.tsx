'use client'

// Full-screen group voice/video call for Team Chat. The call itself runs inside Daily's page in an
// iframe; this wrapper only frames it and gives a Leave button.
export default function GroupCallModal({ url, token, title, onLeave }: { url: string; token: string; title: string; onLeave: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#0F1C3F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', color: '#fff' }}>
        <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <button onClick={onLeave} style={{ height: 34, padding: '0 18px', borderRadius: 999, border: 'none', background: '#DF2F4A', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Leave call</button>
      </div>
      <iframe
        src={`${url}?t=${encodeURIComponent(token)}`}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        title={title}
        style={{ flex: 1, width: '100%', border: 0, background: '#0F1C3F' }}
      />
    </div>
  )
}
