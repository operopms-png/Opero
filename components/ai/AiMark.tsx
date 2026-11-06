'use client'
// The picture of Novourq Cloud AI: the Novourq symbol as a glossy 3D mark on a blue glow.
// From 44px up (or when `animate` is set) it plays as a short looping animation; smaller it is the still picture.
// `active` makes the small light (and, when small, the picture) gently pulse (listening, thinking, speaking).
// Used on the Voice button, the Dashboard AI panel and the AI pages.
export default function AiMark({ size = 32, active = false, dot = true, radius, ring = '#fff', animate }: { size?: number; active?: boolean; dot?: boolean; radius?: number; ring?: string; animate?: boolean }) {
  const r = radius ?? Math.round(size * 0.26)
  const d = Math.max(7, Math.round(size * 0.26))
  const animated = animate ?? size >= 44
  const tile: React.CSSProperties = { width: size, height: size, borderRadius: r, overflow: 'hidden', background: '#2F6DB5', boxShadow: size >= 40 ? '0 6px 16px rgba(11,31,58,.3)' : 'none', display: 'block' }
  return (
    <span aria-hidden="true" style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flex: 'none' }}>
      <style>{`@keyframes nvq-ai-pulse{0%,100%{opacity:.75;transform:scale(1)}50%{opacity:1;transform:scale(1.14)}}@keyframes nvq-ai-mark{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}@media (prefers-reduced-motion:reduce){.nvq-ai-vid{display:none!important}.nvq-ai-still{display:block!important}}`}</style>
      {/* eslint-disable @next/next/no-img-element */}
      {animated ? (
        <span style={{ ...tile, position: 'relative' }}>
          <img className="nvq-ai-still" src="/novourq-ai-mark.webp" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'none' }} />
          <video className="nvq-ai-vid" src="/novourq-ai-mark.mp4" poster="/novourq-ai-mark.webp" autoPlay loop muted playsInline preload="auto" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </span>
      ) : (
        <img src="/novourq-ai-mark.webp" alt="" style={{ ...tile, objectFit: 'cover', animation: active ? 'nvq-ai-mark 1.6s ease-in-out infinite' : undefined }} />
      )}
      {/* eslint-enable @next/next/no-img-element */}
      {dot && <span style={{ position: 'absolute', right: -d * 0.25, top: -d * 0.25, width: d, height: d, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#EAF4FF,#5AA0FF 55%,#2F6DB5)', boxShadow: '0 0 8px rgba(90,160,255,.9)', border: `${Math.max(1.5, size * 0.05)}px solid ${ring}`, boxSizing: 'content-box', animation: active ? 'nvq-ai-pulse 1.1s ease-in-out infinite' : undefined }} />}
    </span>
  )
}
