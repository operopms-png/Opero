'use client'
// The picture of Novourq Cloud AI: the Novourq symbol on a navy tile with a small blue light.
// `active` makes the light and the symbol gently pulse (listening, thinking, speaking).
// Used on the Voice button, the Dashboard AI panel and the AI pages.
export default function AiMark({ size = 32, active = false, dot = true, radius, ring = '#fff' }: { size?: number; active?: boolean; dot?: boolean; radius?: number; ring?: string }) {
  const r = radius ?? Math.round(size * 0.26)
  const d = Math.max(7, Math.round(size * 0.26))
  return (
    <span aria-hidden="true" style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flex: 'none' }}>
      <style>{`@keyframes nvq-ai-pulse{0%,100%{opacity:.75;transform:scale(1)}50%{opacity:1;transform:scale(1.14)}}@keyframes nvq-ai-mark{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}`}</style>
      <span style={{ width: size, height: size, borderRadius: r, background: 'linear-gradient(145deg,#1D4E89,#0B1F3A)', display: 'grid', placeItems: 'center', boxShadow: size >= 40 ? '0 6px 16px rgba(11,31,58,.3)' : 'none' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/novourq-mark-white.png" alt="" style={{ width: size * 0.68, height: 'auto', animation: active ? 'nvq-ai-mark 1.6s ease-in-out infinite' : undefined }} />
      </span>
      {dot && <span style={{ position: 'absolute', right: -d * 0.25, top: -d * 0.25, width: d, height: d, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#EAF4FF,#5AA0FF 55%,#2F6DB5)', boxShadow: '0 0 8px rgba(90,160,255,.9)', border: `${Math.max(1.5, size * 0.05)}px solid ${ring}`, boxSizing: 'content-box', animation: active ? 'nvq-ai-pulse 1.1s ease-in-out infinite' : undefined }} />}
    </span>
  )
}
