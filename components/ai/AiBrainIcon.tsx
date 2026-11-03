'use client'
// Novourq Cloud AI mark: organic brain on the left, circuit traces on the right, AI chip at the centre.
import React, { useId } from 'react'

export default function AiBrainIcon({ size = 68 }: { size?: number }) {
  const id = useId().replace(/:/g, '')
  const g = `g${id}`, fold = `f${id}`, ck = `c${id}`
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: Math.round(size * 0.27), background: 'radial-gradient(circle at 50% 45%,#12306b 0%,#071230 75%)', border: '1px solid #1f3f8a', display: 'grid', placeItems: 'center', flex: 'none' }}>
      <svg viewBox="0 0 200 170" width="92%" height="92%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id={g} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <linearGradient id={fold} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c9a6ff" /><stop offset="1" stopColor="#ff7aa8" /></linearGradient>
          <linearGradient id={ck} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7fe4ff" /><stop offset="1" stopColor="#3a8bff" /></linearGradient>
        </defs>
        <path d="M62 112C28 108 17 80 33 60C34 36 62 24 84 33C99 18 131 21 142 40C168 38 186 62 176 84C188 102 174 124 150 126C146 146 120 151 107 138C98 150 77 149 72 133C67 128 63 120 62 112Z" fill="#0b1b45" stroke={`url(#${ck})`} strokeWidth="2" filter={`url(#${g})`} />
        <g fill="none" stroke={`url(#${fold})`} strokeWidth="2" strokeLinecap="round" opacity=".95">
          <path d="M42 66C50 58 58 62 62 54C66 46 76 46 82 42" /><path d="M38 88C48 84 52 92 60 88C68 84 70 92 78 88" /><path d="M52 108C58 100 66 104 70 98" /><path d="M70 62C74 70 82 68 84 76" /><path d="M46 76C52 74 56 78 60 76" />
        </g>
        <g fill="none" stroke={`url(#${ck})`} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${g})`}>
          <path d="M122 70V50H140V42" /><path d="M130 82H156V62H168" /><path d="M130 94H162V108" /><path d="M122 104V122H138V134" /><path d="M112 66V44" /><path d="M108 108V132" />
        </g>
        <g fill="#aeeaff"><circle cx="140" cy="41" r="2.2" /><circle cx="168" cy="62" r="2.2" /><circle cx="162" cy="108" r="2.2" /><circle cx="138" cy="134" r="2.2" /><circle cx="112" cy="43" r="2.2" /><circle cx="108" cy="133" r="2.2" /></g>
        <g filter={`url(#${g})`}>
          <rect x="82" y="66" width="46" height="46" rx="7" fill="#0a1d4a" stroke={`url(#${ck})`} strokeWidth="2" />
          <path d="M92 66v-5M102 66v-5M112 66v-5M122 66v-5M92 112v5M102 112v5M112 112v5M122 112v5M82 76h-5M82 86h-5M82 96h-5M82 106h-5M128 76h5M128 86h5M128 96h5M128 106h5" stroke="#7fe4ff" strokeWidth="2" strokeLinecap="round" />
          <text x="105" y="97" textAnchor="middle" fontFamily="DM Sans, Arial, sans-serif" fontWeight="700" fontSize="19" fill="#bff1ff">AI</text>
        </g>
      </svg>
    </span>
  )
}
