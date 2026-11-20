'use client'
// Staff Centre → Operations → Upkeep: repairs and cleaning on one board, with a switch at the top.
import { Suspense, useEffect, useState } from 'react'
import Repairs from '../maintenance/page'
import Cleaning from '../../cleaning/page'

const C = { ink: '#10234d', blue: '#2f5bd6', soft: '#eaf0fd', line: '#dfe6f4', muted: '#6b7a9f' }

function UpkeepInner() {
  const [view, setView] = useState<'repairs' | 'cleaning'>('repairs')
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('view')
    if (v === 'cleaning' || v === 'repairs') setView(v)
  }, [])
  const pick = (v: 'repairs' | 'cleaning') => { setView(v); window.history.replaceState(null, '', `/staff-centre/upkeep?view=${v}`) }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, padding: '14px 24px 0', background: '#fff', borderBottom: `1px solid ${C.line}` }}>
        {([['repairs', 'Repairs & maintenance'], ['cleaning', 'Cleaning']] as const).map(([k, l]) => (
          <button key={k} onClick={() => pick(k)} style={{ padding: '9px 16px', border: 'none', borderBottom: `3px solid ${view === k ? C.blue : 'transparent'}`, background: 'none', color: view === k ? C.blue : C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
        ))}
      </div>
      {view === 'repairs' ? <Repairs /> : <Cleaning />}
    </div>
  )
}

export default function UpkeepBoardPage() {
  return <Suspense fallback={<div style={{ padding: 40, color: C.muted }}>Loading…</div>}><UpkeepInner /></Suspense>
}
